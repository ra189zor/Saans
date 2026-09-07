"""
"Ask WHO Assistant" - retrieval-augmented answering over the WHO handbook.

THE RULE
--------
Answers come only from the WHO Operational Handbook on Tuberculosis, Module 5.
Nothing else. If the retrieved passages do not contain the answer, the assistant
says so and stops rather than filling the gap from the model's own memory:

    "I cannot find this in the WHO handbook - please refer to a clinician."

Two separate guards enforce that, because one is not enough:

1. Before the model is called at all, retrieval similarity is checked against
   MIN_SIMILARITY. Nothing relevant means an immediate refusal and no API call -
   a model given weak context is a model invited to improvise.
2. The system prompt instructs the model to emit that exact sentence when the
   passages fall short, and the reply is checked for it afterwards.

Every answer ships with the page numbers it came from, so the health worker can
open the handbook and check.

WHY NOT CHROMADB
----------------
ChromaDB pulls opentelemetry, which requires protobuf >= 5. TensorFlow 2.10 -
which runs the chest X-ray model - requires protobuf < 3.20. The two cannot
coexist in one environment, and the X-ray model is the more important of the
two. So retrieval uses a small local vector store instead: embeddings from
all-MiniLM-L6-v2 running on onnxruntime, cosine similarity over a numpy matrix.
For a 264-page handbook that is a few hundred kilobytes and a millisecond of
search - a vector database would be scaffolding around a numpy dot product.

WHY GROQ, AND WHAT IT COSTS
---------------------------
Groq's free tier is persistent and needs no card. The alternative considered was
Alibaba Model Studio, whose free quota expires 90 days after activation - fine
today, dead by the time anyone reads the repository.

This is the only part of Saans that needs the internet. Screening, scoring, the
X-ray model and the cough analyser all run locally. When there is no key or no
connection, this feature reports itself unavailable and the rest of the app is
unaffected.
"""

import json
import os
import re
import urllib.error
import urllib.request

import numpy as np

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HANDBOOK = os.environ.get(
    "SAANS_HANDBOOK_PDF", os.path.join(_ROOT, "books", "WHO Operational Handbook PDF.pdf")
)
INDEX_PATH = os.environ.get(
    "SAANS_WHO_INDEX", os.path.join(_ROOT, "backend", "models", "who_index.npz")
)
EMBED_DIR = os.environ.get(
    "SAANS_EMBED_MODEL", os.path.join(_ROOT, "backend", "models", "embedding")
)
EMBED_REPO = "sentence-transformers/all-MiniLM-L6-v2"

RERANK_DIR = os.environ.get(
    "SAANS_RERANK_MODEL", os.path.join(_ROOT, "backend", "models", "reranker")
)
RERANK_REPO = "Xenova/ms-marco-MiniLM-L-6-v2"
# Set SAANS_RERANK=0 to fall back to plain vector order.
RERANK_ENABLED = os.environ.get("SAANS_RERANK", "1") != "0"

# Chunking. Small enough that a retrieved passage is mostly on-topic, with an
# overlap so a sentence spanning a boundary is not lost to both chunks.
CHUNK_CHARS = 900
CHUNK_OVERLAP = 150
MIN_CHUNK_CHARS = 120

TOP_K = 4
MIN_SIMILARITY = 0.25     # below this, refuse without calling the model

# How many vector hits the cross-encoder re-reads before the best TOP_K are
# kept. 30 was chosen by measurement, not taste: the passage answering "what is
# the TB dose for a 12 kg child?" sits at vector rank 27, and reranking lifts it
# to 1. A larger pool costs roughly 35 ms per extra passage for nothing.
RERANK_POOL = 30

REFUSAL = "I cannot find this in the WHO handbook - please refer to a clinician."

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# gpt-oss-20b over the compound models, measured on both quality and failure.
#
# compound-mini was tried as the default because it answered the dosing
# question more fully, but that turned out to be the prompt rather than the
# model - the dosing rule below gets the same answer out of gpt-oss at a third
# of the latency. Against it: compound routes internally to gpt-oss-120b and
# spends that model's 8,000 tokens a minute, so its advertised 70,000 is not
# real; it allows 250 requests a day rather than 1,000; it leaked tool-citation
# markers such as "【2†L1-L3】" into one answer in eight; and it returns HTTP 413
# when it reaches for a web tool, which reaches the health worker as a 503.
# Its larger sibling groq/compound does that reproducibly.
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
GROQ_TIMEOUT = 30

# Groq sits behind Cloudflare, which rejects urllib's default
# "Python-urllib/3.x" agent with 403 and Cloudflare error 1010 - a client
# fingerprint block, not an authentication failure, and nothing to do with the
# key. Any real agent string gets through. Without this every question fails.
USER_AGENT = "saans/0.1 (+https://github.com/; paediatric TB screening)"

SYSTEM_PROMPT = f"""You answer questions for a community health worker screening \
children under five for tuberculosis in a rural clinic.

You may use ONLY the numbered passages from the WHO Operational Handbook on \
Tuberculosis, Module 5, that are given to you. You have no other source.

Rules:
- If the passages do not contain the answer, reply with exactly this sentence \
and nothing else: "{REFUSAL}"
- Never use knowledge from outside the passages. Never guess a dose, a duration \
or a threshold that is not written there.
- Answer in plain, simple English. Short sentences. A health worker, not a \
doctor, is reading it.
- Keep it under 120 words.
- NEVER answer a dose or a tablet count with a bare number. "3 tablets" is not \
safe to act on: three tablets of what, in which phase? Every such answer must \
name the weight band it was read from, name the medicines, and separate the \
intensive phase from the continuation phase. If a medicine is only added for \
some children, say that rather than listing it as routine.
- Write plain text. The screen shows your answer exactly as written and does \
not render markdown, so asterisks, hashes and backticks appear as themselves. \
Use "-" for a list and nothing for emphasis.
- Do not add a disclaimer; the screen already shows one.
"""

# Belt and braces for the rule above: models reach for **bold** by habit, and
# "give **3 tablets**" on a clinical screen reads as a rendering bug.
_MARKDOWN_NOISE = [
    (re.compile(r"\*\*(.+?)\*\*", re.S), r"\1"),   # **bold**
    (re.compile(r"__(.+?)__", re.S), r"\1"),       # __bold__
    (re.compile(r"(?m)^\s{0,3}#{1,6}\s+"), ""),    # ### headings
    (re.compile(r"`([^`]+)`"), r"\1"),             # `code`
]


def strip_markdown(text):
    for pattern, replacement in _MARKDOWN_NOISE:
        text = pattern.sub(replacement, text)
    return text.strip()


# --------------------------------------------------------------------------
# Embedding - MiniLM on onnxruntime, no torch
# --------------------------------------------------------------------------

_session = None
_tokenizer = None


def _ensure_embedder():
    """Load the ONNX encoder, downloading it once if it is not on disk."""
    global _session, _tokenizer
    if _session is not None:
        return _session, _tokenizer

    import onnxruntime
    from tokenizers import Tokenizer

    model_path = os.path.join(EMBED_DIR, "onnx", "model.onnx")
    tok_path = os.path.join(EMBED_DIR, "tokenizer.json")
    if not (os.path.exists(model_path) and os.path.exists(tok_path)):
        from huggingface_hub import hf_hub_download

        os.makedirs(EMBED_DIR, exist_ok=True)
        for name in ("onnx/model.onnx", "tokenizer.json"):
            hf_hub_download(repo_id=EMBED_REPO, filename=name, local_dir=EMBED_DIR)

    _session = onnxruntime.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    _tokenizer = Tokenizer.from_file(tok_path)
    _tokenizer.enable_truncation(max_length=256)
    _tokenizer.enable_padding()
    return _session, _tokenizer


def embed(texts):
    """Mean-pooled, L2-normalised sentence embeddings. Returns (n, 384) float32."""
    session, tokenizer = _ensure_embedder()
    encoded = tokenizer.encode_batch(list(texts))

    ids = np.array([e.ids for e in encoded], dtype=np.int64)
    mask = np.array([e.attention_mask for e in encoded], dtype=np.int64)
    feed = {"input_ids": ids, "attention_mask": mask}
    if any(i.name == "token_type_ids" for i in session.get_inputs()):
        feed["token_type_ids"] = np.zeros_like(ids)

    hidden = session.run(None, feed)[0]                    # (n, seq, 384)
    m = mask[..., None].astype(np.float32)
    pooled = (hidden * m).sum(axis=1) / np.maximum(m.sum(axis=1), 1e-9)
    norms = np.linalg.norm(pooled, axis=1, keepdims=True)
    return (pooled / np.maximum(norms, 1e-9)).astype(np.float32)


# --------------------------------------------------------------------------
# Reranking - a cross-encoder second pass over the vector hits
# --------------------------------------------------------------------------
#
# The embedder turns the question and each passage into a vector separately and
# compares the two summaries. That is fast enough to search a whole book in
# 3 ms, and it is why "what is the TB dose for a 12 kg child?" failed: the
# handbook writes doses as "number of tablets by weight band", the passage is
# mostly digits, and no summary of one looks like a summary of the other.
#
# A cross-encoder reads the question and the passage together and scores the
# pair, so it can see that "3 tablets" answers "what dose". It is far too slow
# to run over 1,055 chunks, so it re-reads only the top RERANK_POOL that the
# vector search already found. Measured on the dosing questions: vector rank 27
# and 28 both become rank 1, and the phrasing that already worked stays at 1.
#
# It is optional in the strict sense. Missing model, no network on first run,
# or SAANS_RERANK=0, and retrieval falls back to plain vector order - the
# assistant is degraded, never broken.

_rerank_session = None
_rerank_tokenizer = None
_rerank_failed = False


def _ensure_reranker():
    """Load the cross-encoder, downloading it once. None if unavailable."""
    global _rerank_session, _rerank_tokenizer, _rerank_failed
    if _rerank_failed or not RERANK_ENABLED:
        return None, None
    if _rerank_session is not None:
        return _rerank_session, _rerank_tokenizer

    try:
        import onnxruntime
        from tokenizers import Tokenizer

        model_path = os.path.join(RERANK_DIR, "onnx", "model.onnx")
        tok_path = os.path.join(RERANK_DIR, "tokenizer.json")
        if not (os.path.exists(model_path) and os.path.exists(tok_path)):
            from huggingface_hub import hf_hub_download

            os.makedirs(RERANK_DIR, exist_ok=True)
            for name in ("onnx/model.onnx", "tokenizer.json"):
                hf_hub_download(repo_id=RERANK_REPO, filename=name,
                                local_dir=RERANK_DIR)

        options = onnxruntime.SessionOptions()
        # The server this runs on is a 2-core/4-thread laptop CPU.
        options.intra_op_num_threads = 4
        _rerank_session = onnxruntime.InferenceSession(
            model_path, options, providers=["CPUExecutionProvider"]
        )
        _rerank_tokenizer = Tokenizer.from_file(tok_path)
        _rerank_tokenizer.enable_truncation(max_length=384)
        _rerank_tokenizer.enable_padding()
    except Exception as exc:
        # Tried once, then left alone: a reranker that cannot load must not
        # cost a failed download on every question.
        _rerank_failed = True
        print(f"[rag] reranker unavailable, using vector order only: {exc}")
        return None, None

    return _rerank_session, _rerank_tokenizer


def rerank(question, passages):
    """
    Reorder passages by cross-encoder relevance. Unchanged if unavailable.

    Each passage keeps its vector `score`; the pair score is added as
    `rerank_score` so the two are never confused downstream.
    """
    session, tokenizer = _ensure_reranker()
    if session is None or not passages:
        return passages

    encoded = tokenizer.encode_batch(
        [(question, p["text"]) for p in passages]
    )
    ids = np.array([e.ids for e in encoded], dtype=np.int64)
    mask = np.array([e.attention_mask for e in encoded], dtype=np.int64)
    feed = {"input_ids": ids, "attention_mask": mask}
    if any(i.name == "token_type_ids" for i in session.get_inputs()):
        feed["token_type_ids"] = np.array(
            [e.type_ids for e in encoded], dtype=np.int64
        )

    logits = session.run(None, feed)[0]
    scores = logits[:, 0] if logits.shape[-1] == 1 else logits[:, -1]
    for passage, score in zip(passages, scores):
        passage["rerank_score"] = round(float(score), 4)
    return sorted(passages, key=lambda p: p["rerank_score"], reverse=True)


# --------------------------------------------------------------------------
# Chunking the handbook
# --------------------------------------------------------------------------

# At least one dot is required: handbook sections are "4.2", "5.2.4", "7.1.5".
# Allowing a bare number matched numbered list items instead - "4 Check
# injection site:" was being reported as the section for a dosing question.
SECTION_RE = re.compile(r"(?m)^\s*(\d+(?:\.\d+){1,3})\.?\s+([A-Z][^\n]{4,80})$")

# Captions of tables and annexes. The dot after the number is what separates a
# caption from a mention of one: "Table 5.5. Dosing table for first-line
# medicines" opens the table, "Table 5.5 shows the recommended dosages" is
# prose about it, and splitting on the second would cut a sentence in half.
# pypdf renders the ligature in "Table" as "T able" on some pages, hence \s?.
CAPTION_RE = re.compile(
    r"(?m)^\s*((?:T\s?able|Annex)\s+\d+(?:\.\d+)?\.\s+\S[^\n]{3,110})"
)


def chunk_handbook(pdf_path=None):
    """
    PDF -> list of {text, page, section}.

    Page numbers are kept so every answer can point at somewhere the health
    worker can actually turn to, and the nearest numbered heading is recorded as
    the section label.
    """
    from pypdf import PdfReader

    reader = PdfReader(pdf_path or HANDBOOK)
    chunks = []
    section = None
    section_page = 0
    # A heading carries forward onto the pages that follow it, but not forever.
    # Past this many pages the label is stale - annex pages were inheriting
    # "7.6.3 Nutritional care" from a section that ended long before. The page
    # number is the citation that matters; a wrong section is worse than none.
    SECTION_CARRY_PAGES = 5

    for page_index, page in enumerate(reader.pages, start=1):
        try:
            raw = page.extract_text() or ""
        except Exception:
            continue

        text = re.sub(r"[ \t]+", " ", raw)
        text = re.sub(r"\n{2,}", "\n", text).strip()
        if len(text) < MIN_CHUNK_CHARS:
            continue

        # Headings with their positions, so a chunk is labelled with the
        # heading it actually sits under. Taking the page's first heading and
        # applying it to the whole page mislabelled everything above it: the
        # first-line dosing table on page 120 was filed under the meningitis
        # section that begins below it, which is wrong in the citation the
        # health worker reads as well as in the vector.
        headings = [
            (m.start(), f"{m.group(1)} {m.group(2).strip()}")
            for m in SECTION_RE.finditer(text)
        ]
        if headings:
            section_page = page_index
        elif page_index - section_page > SECTION_CARRY_PAGES:
            section = None

        def section_at(offset, carried=section):
            """The last heading at or before this offset, else the carried one."""
            label = carried
            for position, heading in headings:
                if position > offset:
                    break
                label = heading
            return label

        for caption, segment, segment_offset in split_at_captions(text):
            start = 0
            while start < len(segment):
                piece = segment[start:start + CHUNK_CHARS].strip()
                # A captioned fragment is kept even when short. Table bodies
                # are terse - "12–<16 3 3 3" is a whole row - and dropping
                # them for length is how the dosing tables went missing.
                if len(piece) >= MIN_CHUNK_CHARS or (caption and piece):
                    chunks.append({
                        "text": piece,
                        "page": page_index,
                        "section": section_at(segment_offset + start),
                        "caption": caption,
                    })
                if start + CHUNK_CHARS >= len(segment):
                    break
                start += CHUNK_CHARS - CHUNK_OVERLAP

        # Carry the page's last heading onto the pages that follow.
        if headings:
            section = headings[-1][1]
    return chunks


def split_at_captions(text):
    """
    Cut a page where a table or annex caption starts, and label the pieces.

    Slicing purely on a character count severs a table from the line that says
    what it is. Table 5.5 on page 120 is the case that made this necessary: the
    caption fell at the end of one chunk and the rows began the next, so the
    rows reached the index as "4–<8 1 1 1, 8–<12 2 2 2" with nothing to say
    they were doses. A caption now opens its own segment and every chunk of
    that segment carries it.

    Returns (caption or None, segment, offset of the segment in `text`).
    """
    matches = list(CAPTION_RE.finditer(text))
    if not matches:
        return [(None, text, 0)]

    segments = []
    if matches[0].start() > 0:
        segments.append((None, text[:matches[0].start()].strip(), 0))
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        segments.append(
            (match.group(1).strip(), text[match.start():end].strip(), match.start())
        )
    return [(c, s, o) for c, s, o in segments if s]


def embed_text(chunk):
    """
    What gets embedded: the section heading and table caption, then the text.

    Splitting on a character count regularly separates a table from the
    caption that says what it is. The first-line dosing table on page 118 is
    the case that matters — "Table 5.3" and "Recommended dosages for first-line
    TB medicines" fall at the end of one chunk, and the numbers underneath
    start the next one, so that chunk reached the index as a bare list of drugs
    and figures. It matched nothing a health worker would type.

    The heading is already carried on every chunk as metadata. Embedding it
    too gives a continuation chunk back the context its neighbour kept. The
    stored text is unchanged, so nothing about what is displayed or cited
    moves.
    """
    text = chunk["text"]
    prefix = [chunk.get("section")]
    # Not repeated when the chunk already opens with its caption — only the
    # continuation rows need it put back.
    caption = chunk.get("caption")
    if caption and not text.startswith(caption[:40]):
        prefix.append(caption)
    return "\n".join([p for p in prefix if p] + [text])


def build_index(pdf_path=None, out_path=None):
    """Chunk, embed and save. Run once; the result is a few hundred KB."""
    out_path = out_path or INDEX_PATH
    chunks = chunk_handbook(pdf_path)
    if not chunks:
        raise RuntimeError(f"No text extracted from {pdf_path or HANDBOOK}")

    vectors = embed([embed_text(c) for c in chunks])
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    np.savez_compressed(
        out_path,
        vectors=vectors,
        texts=np.array([c["text"] for c in chunks], dtype=object),
        pages=np.array([c["page"] for c in chunks], dtype=np.int32),
        sections=np.array([c["section"] or "" for c in chunks], dtype=object),
        captions=np.array([c.get("caption") or "" for c in chunks], dtype=object),
    )
    return len(chunks), out_path


_index = None


def load_index():
    global _index
    if _index is None and os.path.exists(INDEX_PATH):
        data = np.load(INDEX_PATH, allow_pickle=True)
        _index = {
            "vectors": data["vectors"],
            "texts": data["texts"],
            "pages": data["pages"],
            "sections": data["sections"],
            # Absent from indexes built before captions were tracked.
            "captions": data["captions"] if "captions" in data.files else None,
        }
    return _index


def retrieve(question, top_k=TOP_K):
    """Most similar passages, best first. Cosine similarity - vectors are normalised."""
    index = load_index()
    if index is None:
        raise RuntimeError(
            f"No handbook index at {INDEX_PATH}. Build it with:\n"
            "    python notebooks/build_who_index.py"
        )
    scores = index["vectors"] @ embed([question])[0]
    captions = index.get("captions")

    # Widen, then let the cross-encoder narrow. Without a reranker the pool is
    # just top_k and this behaves exactly as it did before.
    pool_size = max(top_k, RERANK_POOL) if RERANK_ENABLED else top_k
    order = np.argsort(scores)[::-1][:pool_size]

    # The highest vector similarity in the pool, carried on every passage.
    # ask() refuses on this rather than on whatever reranking put first, so an
    # off-topic question is still refused without an API call and reranking
    # cannot silently change what counts as "nothing relevant found".
    vector_best = round(float(scores[order[0]]), 4) if len(order) else 0.0

    candidates = [
        {
            "text": str(index["texts"][i]),
            "page": int(index["pages"][i]),
            "section": str(index["sections"][i]) or None,
            # Passed to the model with the passage: a row of numbers means
            # nothing without the caption that says what the numbers are.
            "caption": (str(captions[i]) or None) if captions is not None else None,
            "score": round(float(scores[i]), 4),
            "vector_best": vector_best,
        }
        for i in order
    ]

    # Nothing relevant was found, so ask() is about to refuse. Reranking a set
    # the caller will throw away costs a second for no answer, and refusing an
    # off-topic question quickly is a property worth keeping.
    if vector_best < MIN_SIMILARITY:
        return candidates[:top_k]

    return rerank(question, candidates)[:top_k]


# --------------------------------------------------------------------------
# Answering
# --------------------------------------------------------------------------

def groq_available():
    return bool(os.environ.get("GROQ_API_KEY"))


def _call_groq(question, passages):
    context = "\n\n".join(
        f"[{n}] (page {p['page']}"
        + (f", section {p['section']}" if p["section"] else "")
        + f")\n"
        # The caption travels with the passage. Without it a retrieved table
        # row reads as loose digits and the model cannot say what they are.
        + (f"{p['caption']}\n" if p.get("caption") else "")
        + p["text"]
        for n, p in enumerate(passages, start=1)
    )
    payload = {
        "model": GROQ_MODEL,
        "temperature": 0,          # a clinical lookup should not be creative
        # gpt-oss reasons before it answers, and those tokens are spent from
        # the same allowance as the answer. At 400 the longer questions used
        # the whole budget thinking and came back with finish_reason "length"
        # and an empty string - a blank answer bubble on a clinical screen.
        # Room for both, and the shortest reasoning the model offers.
        "max_tokens": 1200,
        "reasoning_effort": "low",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Passages:\n{context}\n\nQuestion: {question}"},
        ],
    }

    data = _post_groq(payload)
    choice = data["choices"][0]
    answer = (choice["message"].get("content") or "").strip()

    # An empty answer is a failure, not an answer. Say so rather than showing
    # the health worker an empty bubble that looks like the handbook is silent.
    if not answer:
        raise RuntimeError(
            f"Groq returned no answer (finish_reason="
            f"{choice.get('finish_reason')}). Raise max_tokens in server/rag.py."
        )
    return strip_markdown(answer)


def _post_groq(payload):
    """
    One chat completion, with the retry that keeps the model swappable.

    `reasoning_effort` is rejected outright by models that do not reason, so
    sending it unconditionally would turn changing GROQ_MODEL into a footgun.
    It is sent, and dropped on the one error that says it is unsupported.
    """
    def send(body):
        request = urllib.request.Request(
            GROQ_URL,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {os.environ['GROQ_API_KEY']}",
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT,
            },
        )
        with urllib.request.urlopen(request, timeout=GROQ_TIMEOUT) as response:
            return json.loads(response.read())

    try:
        return send(payload)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:300]
        if "reasoning_effort" in detail:
            retry = {k: v for k, v in payload.items() if k != "reasoning_effort"}
            try:
                return send(retry)
            except urllib.error.HTTPError as second:
                detail = second.read().decode("utf-8", "replace")[:300]
                raise RuntimeError(f"Groq returned {second.code}: {detail}")
            except urllib.error.URLError as second:
                raise RuntimeError(f"Could not reach Groq (offline?): {second.reason}")
        # Groq's own message is passed through: it names the problem exactly,
        # usually a retired model id or a bad key.
        raise RuntimeError(f"Groq returned {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not reach Groq (offline?): {exc.reason}")


def ask(question: str) -> dict:
    """
    Question in, handbook-grounded answer out.

    Returns answer, the passages it rests on, and whether it refused.
    """
    question = (question or "").strip()
    if not question:
        raise ValueError("Empty question.")

    # Before retrieval, not after. Searching means loading the encoder and the
    # reranker, and on a fresh checkout that is a 177 MB download - paid in
    # full, on a question that was always going to fail for want of a key.
    if not groq_available():
        raise RuntimeError(
            "GROQ_API_KEY is not set. Put it in a .env file at the project root:\n"
            "    GROQ_API_KEY=gsk_your_key_here"
        )

    passages = retrieve(question)
    # The best vector similarity found, not the score of whatever the
    # cross-encoder ranked first — reranking reorders passages, it does not
    # change whether the handbook had anything relevant to say.
    best = passages[0]["vector_best"] if passages else 0.0

    # Guard 1: nothing relevant retrieved. Refuse before spending a call - a
    # model handed weak context is a model invited to fill the gap itself.
    if not passages or best < MIN_SIMILARITY:
        return {
            "answer": REFUSAL,
            "refused": True,
            "reason": "no relevant passage in the handbook",
            "best_similarity": round(float(best), 4),
            "sources": [],
            "model": None,
        }

    answer = _call_groq(question, passages)

    # Guard 2: the model may refuse on its own; report that as a refusal rather
    # than dressing it up as an answer.
    refused = REFUSAL.lower().rstrip(".") in answer.lower()

    return {
        "answer": answer,
        "refused": refused,
        "best_similarity": round(float(best), 4),
        "sources": [] if refused else [
            {"page": p["page"], "section": p["section"], "score": p["score"]}
            for p in passages
        ],
        "model": GROQ_MODEL,
    }
