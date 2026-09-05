"""Saans vision API. Run with: uvicorn server.app:app --port 8000 --reload"""

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .audio import analyze as analyze_cough
from .vision import DEMO_MODE, analyze

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
