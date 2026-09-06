# Saans

A tablet app for community health workers screening children under five for tuberculosis.

It implements the treatment decision algorithms from the *WHO Operational Handbook on Tuberculosis, Module 5: Management of tuberculosis in children and adolescents* (2022), Annex 5. Every question, weight and threshold in the app comes from that document.

Three optional assists sit alongside the algorithm, and none of them can change its answer:

| | what it does | decides anything? |
| --- | --- | --- |
| **Chest X-ray model** | reads an uploaded film, suggests findings, shows a Grad-CAM heatmap | no — the health worker confirms every finding, then the score decides |
| **Cough recording** | ten seconds of audio, cough present, wet or dry | no — a hint only, never reaches the scorer |
| **Ask WHO Assistant** | answers questions from the handbook, with page citations | no — a reference lookup |

English and Urdu, with full right-to-left layout.

## The problem it addresses

TB in young children is hard to confirm. Sputum is difficult to collect, bacteriological tests often come back negative even when the child has TB, and chest X-rays in children are notoriously hard to read. WHO's answer is a scoring algorithm that combines symptoms, risk factors and X-ray findings into a treatment decision that a non-specialist can follow. Saans is that algorithm, on a tablet, in the health worker's language.

## How the screening works

The app walks through WHO's decision path in order. Cheaper and more definitive answers come first, so most children never reach the scoring step.

1. **Visit type** — first visit or follow-up. This gates the lower-risk pathway.
2. **Age** — under five continues, five and over exits as out of scope.
3. **Danger signs** — ten IMCI questions asked one at a time. Any emergency sign ends the session with a referral. Chest indrawing routes to a severity check that can de-escalate.
4. **Risk profile** — HIV status and MUAC tape colour. Children under two, HIV-positive children, and those with a red MUAC reading are high risk. A lower-risk child on a first visit is treated for the likely non-TB cause and re-evaluated in one to two weeks, without being scored.
5. **Rapid test** — a positive Xpert MTB/RIF or urine LF-LAM result starts treatment immediately and skips scoring entirely.
6. **Contact history** — a household or close TB contact in the last twelve months also starts treatment without scoring.
7. **Symptoms and vitals** — cough and fever duration, five symptom toggles, respiratory and heart rate with age-banded thresholds that auto-suggest tachypnoea and tachycardia.
8. **Chest X-ray (optional)** — capture or upload a film, review the model's reading, confirm the findings.

At the symptom step a cough can also be recorded, and from the results screen the
health worker can ask the WHO Assistant a question. Neither affects the score.

The score decides. With an X-ray the app uses Algorithm A weights plus the X-ray sum; without one it uses Algorithm B weights. Treatment is indicated above 10 in both.

A full flowchart is in [ALGORITHM_A_FLOWCHART.md](ALGORITHM_A_FLOWCHART.md).

## The chest X-ray model

DenseNet121, pretrained on ImageNet and fine-tuned on 13,265 chest X-rays from four public sources: NLM Shenzhen, NLM Montgomery County, TBX11K and the Qatar/Dhaka TB database. Duplicate films appearing in more than one source were removed by perceptual hash before splitting, so no image appears in both training and test.

Split 70/15/15. The test set of 1,990 films was scored once, at the end, and influenced neither the training nor the decision threshold.

| | |
| --- | --- |
| TB cases caught | 271 of 285 (95.1%) |
| Missed | 14 |
| False alarms | 30 of 1,705 healthy films |
| Specificity | 98.2% |

The decision threshold is 0.71, chosen for at least 90% recall on the Shenzhen subset rather than on the pooled test set. Shenzhen is the only source where TB and normal films come from the same hospital on the same equipment, which makes it the honest benchmark. Pooled AUC is 0.995, but that figure is inflated: in the Qatar source the normal and TB films come from different collections and differ in appearance for reasons unrelated to disease, so the model separates them perfectly without reading pathology. **The number worth quoting is Shenzhen's AUC of 0.942.**

The model outputs a single probability and a Grad-CAM heatmap showing which regions drove it. It suggests only "opacities" and never the other four findings, because it has one output and was never trained to tell one radiological feature from another. Enlarged lymph nodes carries 17 points on its own, above the treatment threshold, so the confirmation screen asks the health worker to check for it rather than pre-ticking a guess.

Training code: [notebooks/train_xray_model_local.ipynb](notebooks/train_xray_model_local.ipynb). Metrics and per-source breakdown: [backend/models/saans_xray_densenet121.json](backend/models/saans_xray_densenet121.json).

## The cough recording

The symptom screen has a **Record Cough** button. It captures ten seconds with a
visible countdown, resamples to 16 kHz mono in the browser, and posts a WAV to
`/api/audio/cough`. The result is shown as a hint and nothing more — it is never
passed to the scorer.

That restraint is not caution for its own sake. WHO's cough criterion is
duration: "unremitting symptoms lasting more than 2 weeks" (handbook p95). A ten
second recording cannot measure two weeks, so the sound of a cough is not the
thing the algorithm scores. The slider is.

Two components, and they are not equally strong:

**Is there a cough** — a RandomForest over 66 features (20 MFCCs with their
standard deviations and deltas, zero-crossing rate, spectral centroid, rolloff,
low-band energy ratio, burst count and duration). Trained on COUGHVID v3.

**Is it wet or dry** — acoustic thresholds, reported with `calibrated: false`.
Not a trained model, because COUGHVID has only 15 expert-labelled recordings
from children under five.

### The age question, measured rather than assumed

Saans screens under-fives; COUGHVID's median age is 35. Rather than train on a
mixture and hope, every recording from anyone under 18 was **held out of
training entirely**, and the adult-trained model was then scored by age group:

| group | n | accuracy | recall | AUC |
| --- | --- | --- | --- | --- |
| Adults (held out) | 1,157 | 0.935 | 0.961 | 0.982 |
| Children under 18 | 960 | 0.935 | 0.950 | 0.972 |
| Children under 12 | 175 | 0.897 | 0.905 | 0.953 |
| **Children under 5** | **59** | **0.881** | **0.882** | **0.951** |

Adult training transfers, at a cost of about 0.03 AUC. Treat the under-five row
as "around 0.95": 59 recordings is the entire public supply for that age band,
and the confidence interval on it is wide.

Two safeguards follow from this. The energy-based burst detector runs alongside
the model and **either** can call a cough, so an adult-trained classifier cannot
veto a small child's cough on its own. And the screen tells the health worker
what produced the hint, in English and Urdu.

Retrain with `python notebooks/train_cough_model.py`. Feature extraction is
shared with `server/audio.py`, so training and serving cannot drift apart.

## Ask WHO Assistant

The results screen has an **Ask WHO Assistant** button. It opens a chat where the
health worker can type a question — "What is the TB dose for a 12 kg child?" —
and get an answer drawn only from the WHO handbook, with the page it came from
shown underneath.

Retrieval is local. The handbook is split into 1,038 chunks, embedded with
all-MiniLM-L6-v2 running on onnxruntime, and searched by cosine similarity over a
numpy matrix. Only writing the final answer calls out to a hosted model (Groq).

### It refuses rather than guesses

Two independent guards, because one is not enough:

1. **Before any API call**, retrieval similarity is checked. If the best passage
   scores below 0.25 the assistant refuses immediately and no model is called —
   a model handed weak context is a model invited to improvise. Asking it the
   capital of France scores 0.14 and gets the refusal without leaving the machine.
2. **The system prompt** tells the model to emit one exact sentence when the
   passages fall short, and the reply is checked for it afterwards.

The sentence is always: *"I cannot find this in the WHO handbook — please refer
to a clinician."*

### Why not ChromaDB

ChromaDB pulls opentelemetry, which requires protobuf ≥ 5. TensorFlow 2.10, which
runs the chest X-ray model, requires protobuf < 3.20. They cannot coexist, and
installing chromadb silently breaks the X-ray model. For a 264-page handbook the
whole index is 1.7 MB and search is a dot product, so a vector database would be
scaffolding around three lines of numpy.

### Why Groq

Its free tier is persistent and needs no card. Alibaba Model Studio was the
alternative, but its free quota expires 90 days after activation — fine today,
dead by the time anyone else opens this repository.

**This is the only part of Saans that needs the internet.** Screening, scoring,
the X-ray model and the cough analyser all run locally. Without a key or a
connection the assistant says so and everything else carries on.

### Setup

Get a free key at <https://console.groq.com/keys>, then create `.env` in the
project root (it is gitignored — never commit it):

```
GROQ_API_KEY=gsk_your_key_here
```

`.env.example` has the template. Build the search index once:

```bash
python notebooks/build_who_index.py
```

That downloads the ~90 MB encoder on first run and writes
`backend/models/who_index.npz`. The index is committed; the encoder is not.

## Running it

### Frontend

```bash
npm install
npm run dev
```

Opens on http://localhost:5173.

### Backend

One FastAPI service serves all three assists. It needs TensorFlow, and TensorFlow
2.10 is the last release with GPU support on native Windows, which in turn
requires Python 3.10 and numpy < 2. It therefore runs in its own environment.

```bash
conda create -n saans python=3.10 -y
conda activate saans
conda install -c conda-forge cudatoolkit=11.2 cudnn=8.1.0 -y
pip install -r requirements.txt
uvicorn server.app:app --port 8000
```

Do not `pip install chromadb` into this environment. It upgrades protobuf past
what TensorFlow 2.10 accepts and the X-ray model stops loading.

Check both models came up:

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/assistant/status
```

`"demo_mode": false` means the weights were found. `true` means the service is returning a fixed stand-in response, which is what a fresh checkout does, since the 70 MB weights file is not in the repository. Set `SAANS_DEMO_MODE=1` to force that behaviour deliberately.

If weights are present but TensorFlow is missing, the service refuses to start and says so, rather than failing later on each upload.

### Weights

Train them with the notebook, or place `saans_xray_densenet121.h5` and its `.json` sidecar in `backend/models/`. Block 8 of the notebook copies both there.

### Installing it on a phone

Saans is a progressive web app. Opened in a mobile browser it offers **Add to
Home Screen**, and from then on it launches full screen from its own icon with
no address bar.

Two conditions have to hold, and the first one catches people out:

**It must be served over HTTPS.** Browsers refuse to register a service worker
or offer the install prompt on a plain `http://` origin. `localhost` is the one
exception, so a phone pointed at `http://192.168.1.x:5173` gets a website and no
install prompt. Either put a tunnel in front of the server (Cloudflare Tunnel
and Tailscale Funnel both give a free HTTPS hostname without a domain), or
forward the port over USB with `adb reverse tcp:5173 tcp:5173`, which makes the
phone's own `localhost` reach the machine.

**It must be the production build.** The service worker is not generated by
`npm run dev`. Use `npm run build && npm run preview`.

What survives with no network:

| Works offline | Needs the server |
| --- | --- |
| Danger signs, symptoms, vitals, Sum A + Sum B, the result and referral code | Chest X-ray analysis |
| Both languages and the full right-to-left layout | Cough analysis |
| The app shell, launched from the icon with nothing running | Ask WHO Assistant |

The three screens that need the server say so plainly when it is unreachable,
and distinguish "no internet" from "server not running" — see `src/lib/network.js`.
The service worker never caches `/api`, so a stale answer can't be mistaken for
a live one.

Fonts are self-hosted rather than loaded from Google, which matters more than it
sounds: Android ships no Nastaliq face, so a failed CDN request would leave every
Urdu screen in a broken fallback. Both they and the icons are generated:

```bash
python scripts/fetch_fonts.py   # public/fonts/ + src/fonts.css
python scripts/make_icons.py    # public/icons/ + public/favicon.ico
```

`make_icons.py` redraws the same lung mark used on the welcome screen, so the
icon and the app are one shape. If that SVG changes, the paths at the top of the
script need the same change.

## Training

Three separate jobs, all runnable on a laptop. Only the first needs a GPU.

**X-ray** — `notebooks/train_xray_model_local.ipynb`. Downloads roughly 9 GB
across the four datasets, decodes and caches them, trains in two phases, picks a
threshold, and writes the weights and metrics. The Kaggle sets need an API token;
the notebook explains where to put it. On an RTX 3050 laptop GPU: about 40
minutes downloading, a few minutes decoding, 60 to 90 minutes training. The
decoded image cache persists, so later runs go straight to training.

**Cough** — `python notebooks/train_cough_model.py`. Downloads COUGHVID (2.3 GB),
decodes it through a bundled static ffmpeg, holds every child out of training,
and scores the result by age band. A few minutes on CPU once the audio is local.

**Handbook index** — `python notebooks/build_who_index.py`. Chunks the PDF and
embeds 1,038 passages. Under a minute after the encoder downloads.

## Layout

```
src/
  screens/        one component per step in the flow
  data/
    dangerSigns.js  the ten IMCI questions
    scoring.js      WHO Algorithm A and B weights
    vitals.js       age-banded respiratory and heart rate thresholds
  i18n/           English and Urdu dictionaries
  lib/network.js  tells "no internet" apart from "server not running"
  fonts.css       generated — @font-face for the self-hosted faces
public/
  fonts/          Inter, Sora, Noto Nastaliq Urdu (variable, one file each)
  icons/          app icons, including the maskable variant
scripts/          fetch_fonts.py, make_icons.py — regenerate the above
server/
  app.py          FastAPI endpoints, .env loader
  vision.py       X-ray model loading, Grad-CAM, heatmap rendering
  audio.py        cough features, burst detection, trained cough detector
  rag.py          handbook chunking, embeddings, retrieval, grounded answering
backend/models/   weights, metrics, and the handbook search index
notebooks/        train_xray_model_local.ipynb, train_cough_model.py,
                  build_who_index.py
books/            the WHO handbook this implements
.env              your Groq key — gitignored, see .env.example
```

## Limitations

These are real and are stated here rather than buried.

**The model is trained on adults.** No large public paediatric TB chest X-ray dataset exists. Children's chest X-rays differ from adults' in anatomy and in how TB presents: young children more often show enlarged mediastinal lymph nodes, while cavities, common in adults, are rare. The 95% recall figure was measured on adult films and does not transfer. Paediatric fine-tuning is the Phase 1 pilot item.

**WHO does not endorse automated X-ray reading in this age group.** The recommendation on computer-aided detection is "currently limited to people aged 15 years and older" (handbook p41), and the handbook notes that data in children "remain limited, and further research is needed to make recommendations" (p90).

**The X-ray is never the decision.** The handbook is explicit: "A CXR alone cannot be used to determine the correct treatment for the child" (p90), and CXRs "should be read by someone trained in paediatric CXR interpretation". The model suggests, the health worker confirms, and only confirmed findings are scored. Remove the model entirely and the app still works through Algorithm B, which is designed for clinics without an X-ray at all.

**The cough detector is trained on adults.** No public cough dataset exists for
ages 0–4; COUGHVID contributes 88 such recordings in total. It was measured on
children rather than assumed to work — see the table above — but 59 under-fives
is a small test set, and COUGHVID's ages are self-reported on a web form.

**The assistant can only be as good as its retrieval.** If the right passage is
not among the four retrieved, the answer will be a refusal rather than a wrong
answer — but a refusal on a question the handbook does answer is still a failure.
It is also the one feature that needs the internet.

**The test set shares sources with training.** It is a held-out split, not external validation. Performance on films from a hospital the model has never seen is unknown.

**About 35 near-duplicate films survived deduplication**, roughly 0.26% of the data, where a re-encoded copy hashed differently from the original.

## Roadmap

- Fine-tune on paediatric films collected during the pilot
- Replace the single TB output with a multi-label detector for WHO's five X-ray findings, so lymph nodes can be suggested honestly
- Support lateral views, which improve accuracy in younger children
- External validation on films from a clinic outside the training sources
- Native Android via Capacitor, with the models converted to TFLite for on-device inference
- A local LLM option (Ollama) so the assistant works without a connection

## References

- WHO Operational Handbook on Tuberculosis, Module 5: Management of tuberculosis in children and adolescents, 2022 — [books/](books/)
- Jaeger S. et al., NLM Shenzhen and Montgomery County chest X-ray sets
- Liu Y. et al., TBX11K
- Rahman T. et al., Tuberculosis (TB) Chest X-ray Database
- The Union, *Diagnostic CXR Atlas for Tuberculosis in Children*, 2nd edition
