# Running and deploying Saans

Everything operational: how to run it, how to put it on a phone, where the
model files live, and how to retrain them. The [README](../README.md) covers
what the app does and how well it works.

---

### With Docker — one command

```bash
cp .env.example .env    # put your Groq key in it; compose reads this file
docker compose up -d
```

Opens on **http://localhost:8042**. One container serves the API and the page
together, so there is nothing else to start and no second port to remember.
Change the host port with `SAANS_PORT=...` in `.env` if 8042 is taken.

The image builds the frontend in a throwaway Node stage and ships only the
result, so no toolchain goes to the server. `.dockerignore` keeps the build
context at **4.7 MB** rather than the 447 MB the directory weighs — without it
every build would upload `node_modules`, the datasets and the model files.

Weights, the handbook index and the two self-downloading models are a volume
(`./backend/models`), not image layers. The image stays small, a new model does
not mean a rebuild, and the ~170 MB the encoder and reranker fetch on first use
survives one.

```bash
docker compose logs -f saans      # follow it
docker compose restart saans      # after changing .env
docker compose up -d --build      # after changing code
```

### Putting it on someone else's phone

```bash
docker compose --profile tunnel up -d
docker compose logs tunnel | grep trycloudflare.com
```

That prints a public **https://** address. HTTPS is the reason this exists, not
reachability: port forwarding already makes the server reachable, but a browser
refuses to register a service worker or offer **Add to Home Screen** over plain
`http`, so an installable app needs a certificate. This borrows Cloudflare's.

The connection is outbound, so nothing new is opened on the router and it works
behind CGNAT — which most Pakistani ISPs use, and which makes port forwarding a
dead end for this. It reaches the container over the compose network, so
`SAANS_PORT` is irrelevant to it.

**The address changes every time the tunnel restarts.** Start it, take the
address, and leave it running. Generate any QR code from the address you have on
the day, not from one saved earlier.

```bash
docker compose --profile tunnel down    # stop just the tunnel
```

TensorFlow makes this image roughly 3 GB. That is the cost of serving the real
X-ray model; `SAANS_DEMO_MODE=1` skips loading it but not installing it.

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

### Weights, and why they are not in the repository

Three trained files are gitignored. Git keeps every version of a binary forever,
so committing them makes the repository permanently large and slow to clone, and
the encoder is close to GitHub's 100 MB per-file limit anyway.

**A fresh clone runs without any of them.** Nothing crashes; the parts that need
a model degrade and say so:

| File | Size | Without it |
| --- | --- | --- |
| `saans_xray_densenet121.h5` | 28 MB | X-ray falls back to `DEMO_MODE` — a fixed stand-in response |
| `cough_detector.joblib` | 4 MB | The energy-based burst detector answers alone, less reliably |
| `embedding/onnx/model.onnx` | 86 MB | Downloads itself on first use — nothing to do |
| `reranker/onnx/model.onnx` | 87 MB | Downloads itself on first use; without it retrieval falls back to plain vector order |

The `.json` sidecars, the handbook index (`who_index.npz`) and the training plots
**are** committed, so metrics and citations survive a clone.

To get the real models: train them (see [Training](#training)), or copy the two
small files from someone who has. For a team, attaching them to a GitHub Release
is tidier than sending them around — free, up to 2 GB per file, and no repository
bloat. They go in `backend/models/`.

Check which mode you are in:

```bash
curl http://localhost:8000/api/health
```

`"demo_mode": false` means the real X-ray model loaded; `true` means the stand-in.
`SAANS_DEMO_MODE=1` forces the stand-in, `0` forces the real model.

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
`npm run dev`. Use `docker compose up -d`, or without Docker:

```bash
npm run build
uvicorn server.app:app --port 8000
```

Either way the API and the page come from one origin, which is what lets the
service worker's scope cover both the page and the requests it makes.

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
embeds 1,055 passages, splitting each page where a table caption begins so the
rows keep the line that says what they are. Under a minute after the encoder
downloads.

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
  components/
    Guide.jsx     the picture attached to a question, and its viewer
  data/guides.js  which picture belongs to which question
  assets/guides/  the built WebP artwork
public/
  fonts/          Inter, Sora, Noto Nastaliq Urdu (variable, one file each)
  icons/          app icons, including the maskable variant
scripts/          fetch_fonts.py, make_icons.py, build_guides.py
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

## Collecting captures

Off by default. To keep the cough recordings and films that carers agree to,
set this in `.env` and recreate the container:

```bash
SAANS_COLLECT=1
```

```bash
docker compose up -d
```

A consent switch then appears on the capture screens, off each time, and only
what the worker confirms is written to `./backend/data` — mounted as a volume,
so it is on the host where you can back it up and delete it. See
[Keeping what is captured](../README.md#keeping-what-is-captured) for the
layout and what is deliberately not recorded.

Check what is being kept:

```bash
curl http://localhost:8042/api/health
```

Before turning this on for real children, you need a consent script the carer
actually understands, a retention period, and somewhere safer than a laptop to
put the files. The switch is the easy part.
