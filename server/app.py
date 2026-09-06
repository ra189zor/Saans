"""Saans API. Run with: uvicorn server.app:app --port 8000 --reload"""

import os

from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import rag
from .audio import analyze as analyze_cough
from .vision import DEMO_MODE, analyze


def _load_dotenv():
    """
    Read .env at the project root into the environment.

    Ten lines rather than a dependency, and it never overwrites a variable that
    is already set, so a real environment variable still wins over the file.
    """
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load_dotenv()

MAX_UPLOAD_BYTES = 12 * 1024 * 1024
# 10 s of 16 kHz 16-bit mono PCM is ~320 KB; the ceiling leaves room for a
# longer clip or a stray header without accepting an arbitrary upload.
MAX_AUDIO_BYTES = 4 * 1024 * 1024

app = FastAPI(title="Saans Vision API", version="0.1.0")

# The Vite dev server proxies /api, but allow direct calls during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "demo_mode": DEMO_MODE}


@app.post("/api/vision/xray")
async def vision_xray(image: UploadFile = File(...)):
    if not (image.content_type or "").startswith("image/"):
        raise HTTPException(status_code=415, detail="Expected an image upload.")

    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image too large.")

    try:
        return analyze(data)
    except HTTPException:
        raise
    except Exception as exc:  # unreadable / corrupt image
        raise HTTPException(status_code=422, detail=f"Could not analyze image: {exc}")


@app.post("/api/audio/cough")
async def audio_cough(audio: UploadFile = File(...)):
    """
    Acoustic description of a cough recording.

    Supporting information only. The response carries no TB judgement and is not
    an input to the WHO score - the cough criterion is the two-week history the
    health worker takes, not this.
    """
    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload.")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Recording too large.")

    try:
        return analyze_cough(data)
    except ValueError as exc:  # not the 16-bit PCM WAV the client should send
        raise HTTPException(status_code=415, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not analyze audio: {exc}")


# --------------------------------------------------------------------------
# Ask WHO Assistant - answers grounded in the handbook, or no answer at all
# --------------------------------------------------------------------------

@app.get("/api/assistant/status")
def assistant_status():
    """
    Lets the screen say why the assistant is unavailable instead of failing at
    the first question. This is the only part of Saans that needs the internet.
    """
    index = rag.load_index()
    return {
        "index_ready": index is not None,
        "chunks": 0 if index is None else int(len(index["texts"])),
        "api_key_set": rag.groq_available(),
        "model": rag.GROQ_MODEL,
        "available": index is not None and rag.groq_available(),
    }


@app.post("/api/assistant/ask")
def assistant_ask(question: str = Body(..., embed=True)):
    """
    Answer from the WHO handbook only, with the pages it came from.

    Never contributes to the screening score - it is a reference lookup, not a
    clinical decision.
    """
    if not question or not question.strip():
        raise HTTPException(status_code=400, detail="Ask a question first.")
    if len(question) > 500:
        raise HTTPException(status_code=413, detail="Question is too long.")

    try:
        return rag.ask(question)
    except RuntimeError as exc:      # no key, no index, or Groq unreachable
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Assistant failed: {exc}")


# --------------------------------------------------------------------------
# The app itself
# --------------------------------------------------------------------------
#
# Serving the built frontend from the same process is what makes this one
# service on one port. It also removes a class of problem rather than solving
# it: same origin means no CORS, no proxy to keep in step with the API, and a
# service worker whose scope covers both the page and the calls it makes, which
# is what "Add to Home Screen" needs.
#
# Mounted last on purpose. A mount at "/" matches everything, so every /api
# route above has to be registered before it or the API disappears behind the
# page.
#
# In development there is no dist/ and this is skipped, leaving `npm run dev`
# to serve the frontend and proxy /api here exactly as before.

STATIC_DIR = os.environ.get(
    "SAANS_STATIC_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")
)

if os.path.isdir(STATIC_DIR):
    # html=True serves index.html at "/" and for directory paths.
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
