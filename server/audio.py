"""
Cough audio analysis for Saans.

WHAT THIS IS
------------
Two things, and they are not equally strong.

1. IS THERE A COUGH - a trained RandomForest (notebooks/train_cough_model.py),
   fitted on the COUGHVID v3 WAV subset. Reported as `cough_probability`.
   Backed up by an energy-based burst detector; either can call a cough.

2. IS IT WET OR DRY - acoustic thresholds, NOT a trained model. Reported with
   `calibrated: False` because the cut points are reasoned from the physics
   rather than fitted to labelled coughs.

The split exists because of what the data allows. COUGHVID has 2,850 recordings
with expert wet/dry labels, but only 15 of them are from children under five.
Fifteen is not a training set. Cough presence, by contrast, survives the age gap
far better - the burst structure of a cough is similar across ages even though
its pitch is not - so task 1 is defensible on adult-heavy data and task 2 is not.

`analyzer`, `trained_model`, `trained_on` and `calibrated` in the response say
which of the two produced what, so the screen can tell the health worker.

WHAT THE FEATURES MEAN
----------------------
Wet (productive) coughs carry more low-frequency energy and a longer, less
impulsive decay - the "bubbling" of airway secretions. Dry coughs are sharper
and brighter, with energy pushed higher up the spectrum. The separators used
here are spectral centroid, the share of energy below 1 kHz, and burst duration.
These are established correlates in the cough-analysis literature; they are not
a substitute for a clinician listening.

NOT A DIAGNOSIS
---------------
Nothing here detects tuberculosis. The WHO cough criterion - persistent
unremitting cough for two weeks or more (Module 5, Annex 5) - is a history taken
by the health worker, and the score comes from that, never from this.
"""

import io
import math
import os
import wave

import numpy as np

TARGET_SR = 16000

# Cough burst detection
FRAME_MS = 25
HOP_MS = 10
MIN_BURST_MS = 120          # shorter than this is a click, not a cough
MAX_BURST_MS = 900
REFRACTORY_MS = 120         # gap needed before a new burst is counted
ENERGY_THRESHOLD_K = 3.0    # burst starts at median + k * MAD of frame energy

# Wet / dry separators, applied to the averaged burst spectrum.
#
# UNCALIBRATED. These cut points are reasoned from the acoustics, not fitted to
# labelled coughs, because no public paediatric cough set with wet/dry labels
# exists to fit them on. They are the first thing to replace once labelled
# recordings are available - see CALIBRATED below, which the API reports so the
# screen can tell the health worker.
LOW_BAND_HZ = 1000.0
LOW_RATIO_WET = 0.55        # most energy under 1 kHz -> secretion-loaded, wet
LOW_RATIO_DRY = 0.35        # little energy under 1 kHz -> sharp and dry
CENTROID_TIEBREAK_HZ = 1200.0   # only consulted between those two ratios

CALIBRATED = False

N_MFCC = 20
N_MELS = 40


# --------------------------------------------------------------------------
# WAV decoding - stdlib only, so the service needs no audio dependency
# --------------------------------------------------------------------------

def read_wav(data: bytes):
    """
    16-bit PCM WAV in, (float32 mono samples in [-1, 1], sample rate) out.

    The client records with the Web Audio API and hands over 16 kHz mono PCM,
    so this deliberately does not carry a decoder for compressed formats.
    """
    with wave.open(io.BytesIO(data), "rb") as wav:
        channels = wav.getnchannels()
        width = wav.getsampwidth()
        rate = wav.getframerate()
        frames = wav.readframes(wav.getnframes())

    if width != 2:
        raise ValueError(f"expected 16-bit PCM WAV, got {width * 8}-bit")

    samples = np.frombuffer(frames, dtype="<i2").astype(np.float32) / 32768.0
    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)
    return samples, rate


def resample_linear(x: np.ndarray, sr_in: int, sr_out: int) -> np.ndarray:
    """Linear resampling. Adequate here: the client already sends 16 kHz."""
    if sr_in == sr_out or x.size == 0:
        return x
    n_out = int(round(x.size * sr_out / sr_in))
    return np.interp(
        np.linspace(0.0, x.size - 1, n_out, dtype=np.float64),
        np.arange(x.size, dtype=np.float64),
        x,
    ).astype(np.float32)


def trim_silence(x: np.ndarray, sr: int, floor_db: float = 35.0):
    """Drop leading and trailing quiet, keeping a little padding."""
    if x.size == 0:
        return x
    frame = max(1, int(sr * FRAME_MS / 1000))
    hop = max(1, int(sr * HOP_MS / 1000))
    energy = frame_energy(x, frame, hop)
    if energy.size == 0:
        return x
    peak = energy.max()
    if peak <= 0:
        return x
    keep = np.where(20 * np.log10(np.maximum(energy, 1e-12) / peak) > -floor_db)[0]
    if keep.size == 0:
        return x
    start = max(0, keep[0] * hop - frame)
    end = min(x.size, (keep[-1] + 1) * hop + frame)
    return x[start:end]


# --------------------------------------------------------------------------
# Frame-level features
# --------------------------------------------------------------------------

def frame_energy(x: np.ndarray, frame: int, hop: int) -> np.ndarray:
    if x.size < frame:
        return np.zeros(0, dtype=np.float32)
    n = 1 + (x.size - frame) // hop
    idx = np.arange(frame)[None, :] + hop * np.arange(n)[:, None]
    return np.sqrt((x[idx] ** 2).mean(axis=1)).astype(np.float32)


def zero_crossing_rate(x: np.ndarray) -> float:
    if x.size < 2:
        return 0.0
    return float(np.mean(np.abs(np.diff(np.sign(x))) > 0))


def _hz_to_mel(f):
    return 2595.0 * np.log10(1.0 + f / 700.0)


def _mel_to_hz(m):
    return 700.0 * (10.0 ** (m / 2595.0) - 1.0)


def mel_filterbank(sr: int, n_fft: int, n_mels: int = N_MELS) -> np.ndarray:
    """Triangular mel filters, standard HTK-style layout."""
    edges = _mel_to_hz(np.linspace(_hz_to_mel(0.0), _hz_to_mel(sr / 2), n_mels + 2))
    bins = np.floor((n_fft + 1) * edges / sr).astype(int)
    bins = np.clip(bins, 0, n_fft // 2)

    fb = np.zeros((n_mels, n_fft // 2 + 1), dtype=np.float32)
    for m in range(1, n_mels + 1):
        left, centre, right = bins[m - 1], bins[m], bins[m + 1]
        if centre == left:
            centre = left + 1
        if right <= centre:
            right = centre + 1
        if right > n_fft // 2:
            break
        fb[m - 1, left:centre] = (np.arange(left, centre) - left) / (centre - left)
        fb[m - 1, centre:right] = (right - np.arange(centre, right)) / (right - centre)
    return fb


def mfcc(x: np.ndarray, sr: int, n_mfcc: int = N_MFCC) -> np.ndarray:
    """
    MFCCs by the usual route: pre-emphasis, framed FFT, mel filterbank, log, DCT-II.
    Written out in numpy so the service needs no audio library.

    Returns (n_mfcc, n_frames).
    """
    if x.size == 0:
        return np.zeros((n_mfcc, 0), dtype=np.float32)

    emphasised = np.append(x[0], x[1:] - 0.97 * x[:-1]).astype(np.float32)
    frame = max(1, int(sr * FRAME_MS / 1000))
    hop = max(1, int(sr * HOP_MS / 1000))
    if emphasised.size < frame:
        return np.zeros((n_mfcc, 0), dtype=np.float32)

    n = 1 + (emphasised.size - frame) // hop
    idx = np.arange(frame)[None, :] + hop * np.arange(n)[:, None]
    frames = emphasised[idx] * np.hanning(frame).astype(np.float32)

    n_fft = 1 << (frame - 1).bit_length()
    power = (np.abs(np.fft.rfft(frames, n=n_fft, axis=1)) ** 2) / n_fft
    mel = power @ mel_filterbank(sr, n_fft).T
    log_mel = np.log(np.maximum(mel, 1e-10))

    # DCT-II, orthonormal
    k = np.arange(N_MELS)
    basis = np.cos(np.pi / N_MELS * (k[None, :] + 0.5) * np.arange(n_mfcc)[:, None])
    basis *= math.sqrt(2.0 / N_MELS)
    basis[0] *= 1.0 / math.sqrt(2.0)
    return (basis @ log_mel.T).astype(np.float32)


def deltas(feat: np.ndarray) -> np.ndarray:
    """First difference along time, edge-padded."""
    if feat.shape[1] < 2:
        return np.zeros_like(feat)
    return np.diff(feat, axis=1, prepend=feat[:, :1])


def spectrum_stats(segment: np.ndarray, sr: int):
    """Spectral centroid (Hz), rolloff85 (Hz) and the energy share below 1 kHz."""
    if segment.size < 32:
        return 0.0, 0.0, 0.0
    n_fft = 1 << (segment.size - 1).bit_length()
    mag = np.abs(np.fft.rfft(segment * np.hanning(segment.size), n=n_fft))
    freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)
    total = mag.sum()
    if total <= 0:
        return 0.0, 0.0, 0.0

    centroid = float((freqs * mag).sum() / total)
    cumulative = np.cumsum(mag)
    rolloff = float(freqs[int(np.searchsorted(cumulative, 0.85 * total))])
    low_ratio = float(mag[freqs < LOW_BAND_HZ].sum() / total)
    return centroid, rolloff, low_ratio


# --------------------------------------------------------------------------
# Cough burst detection
# --------------------------------------------------------------------------

def detect_bursts(x: np.ndarray, sr: int):
    """
    Find cough-like bursts by adaptive energy thresholding.

    The threshold is median + k * MAD of frame energy rather than a fixed level,
    so it adapts to how loud the room and the microphone happen to be. Bursts
    shorter than MIN_BURST_MS are rejected as clicks and taps.

    Returns a list of (start_sample, end_sample).
    """
    frame = max(1, int(sr * FRAME_MS / 1000))
    hop = max(1, int(sr * HOP_MS / 1000))
    energy = frame_energy(x, frame, hop)
    if energy.size == 0:
        return []

    median = float(np.median(energy))
    mad = float(np.median(np.abs(energy - median))) or 1e-6
    threshold = median + ENERGY_THRESHOLD_K * mad
    if threshold <= 1e-5:            # effectively silence
        return []

    loud = energy > threshold
    bursts = []
    start = None
    refractory = int(REFRACTORY_MS / HOP_MS)
    quiet_run = 0

    for i, is_loud in enumerate(loud):
        if is_loud:
            if start is None:
                start = i
            quiet_run = 0
        elif start is not None:
            quiet_run += 1
            if quiet_run >= refractory:
                bursts.append((start, i - quiet_run))
                start = None
    if start is not None:
        bursts.append((start, len(loud) - 1))

    out = []
    for a, b in bursts:
        duration_ms = (b - a + 1) * HOP_MS
        if MIN_BURST_MS <= duration_ms <= MAX_BURST_MS:
            out.append((a * hop, min(x.size, b * hop + frame)))
    return out


# --------------------------------------------------------------------------
# Feature vector - shared by training and serving
# --------------------------------------------------------------------------

FEATURE_NAMES = (
    [f"mfcc_mean_{i}" for i in range(N_MFCC)]
    + [f"mfcc_std_{i}" for i in range(N_MFCC)]
    + [f"mfcc_delta_mean_{i}" for i in range(N_MFCC)]
    + ["zcr", "centroid_hz", "rolloff85_hz", "low_band_ratio", "burst_count", "mean_burst_ms"]
)


def preprocess(samples: np.ndarray, sr: int):
    """Resample to 16 kHz, trim the quiet ends, normalise the level."""
    samples = resample_linear(samples, sr, TARGET_SR)
    samples = trim_silence(samples, TARGET_SR)
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    if peak > 0:
        samples = samples / peak     # the microphone gain is unknown
    return samples, TARGET_SR


def feature_vector(samples: np.ndarray, sr: int) -> np.ndarray:
    """
    Fixed-length description of one recording, in FEATURE_NAMES order.

    Training and serving both call this, so the two cannot drift apart - the
    classic way a model that scored well in a notebook quietly degrades in
    production.

    Clip duration is deliberately excluded. COUGHVID recordings vary in length
    for reasons that have nothing to do with whether a cough is present, and a
    model that learned "long file means cough" would score well here and fail on
    the fixed 10-second clips the app records.
    """
    coeffs = mfcc(samples, sr)
    if coeffs.shape[1]:
        mfcc_mean = coeffs.mean(axis=1)
        mfcc_std = coeffs.std(axis=1)
        delta_mean = deltas(coeffs).mean(axis=1)
    else:
        mfcc_mean = mfcc_std = delta_mean = np.zeros(N_MFCC, dtype=np.float32)

    bursts = detect_bursts(samples, sr)
    if bursts:
        stats = [spectrum_stats(samples[a:b], sr) for a, b in bursts]
        centroid = float(np.mean([s[0] for s in stats]))
        rolloff = float(np.mean([s[1] for s in stats]))
        low_ratio = float(np.mean([s[2] for s in stats]))
        burst_ms = float(np.mean([(b - a) / sr for a, b in bursts]) * 1000)
    else:
        centroid = rolloff = low_ratio = burst_ms = 0.0

    return np.concatenate([
        mfcc_mean, mfcc_std, delta_mean,
        [zero_crossing_rate(samples), centroid, rolloff, low_ratio, len(bursts), burst_ms],
    ]).astype(np.float32)


# --------------------------------------------------------------------------
# Trained cough / non-cough detector, when one is present
# --------------------------------------------------------------------------

_MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "models")
COUGH_MODEL_PATH = os.environ.get(
    "SAANS_COUGH_MODEL", os.path.join(_MODELS_DIR, "cough_detector.joblib")
)
COUGH_PRESENT_THRESHOLD = 0.5

_cough_model = None
_cough_model_tried = False


def load_cough_model():
    """
    RandomForest from notebooks/train_cough_model.py, if it has been trained.

    Absence is not an error: the burst detector alone still answers whether a
    cough is present, just less reliably. Loading is attempted once and the
    outcome cached, so a missing file does not cost a disk hit per request.
    """
    global _cough_model, _cough_model_tried
    if _cough_model_tried:
        return _cough_model
    _cough_model_tried = True

    if os.path.exists(COUGH_MODEL_PATH):
        try:
            import joblib

            bundle = joblib.load(COUGH_MODEL_PATH)
            if list(bundle.get("feature_names", [])) != FEATURE_NAMES:
                # The model was trained against a different feature layout, so
                # its inputs would silently mean the wrong things. Refuse it.
                print(f"[audio] ignoring {COUGH_MODEL_PATH}: feature names do not match")
                return None
            _cough_model = bundle["model"]
        except Exception as exc:
            print(f"[audio] could not load {COUGH_MODEL_PATH}: {exc}")
    return _cough_model


# --------------------------------------------------------------------------
# Entry point used by the API layer
# --------------------------------------------------------------------------

def analyze(audio_bytes: bytes) -> dict:
    """
    Uploaded recording in, acoustic description out.

    Never returns a TB judgement, and never a fixed answer: every field is
    derived from the audio that was sent.
    """
    raw, raw_sr = read_wav(audio_bytes)
    duration_s = round(raw.size / raw_sr, 2) if raw_sr else 0.0
    samples, sr = preprocess(raw, raw_sr)

    bursts = detect_bursts(samples, sr)

    # Either signal is enough to call it a cough, deliberately.
    #
    # The trained detector learned from COUGHVID, which is adult-heavy, so it may
    # not recognise a small child's cough - higher pitched, shorter, quieter. The
    # energy-based burst detector has no such bias because it keys on the shape
    # of the sound rather than its timbre. Requiring both would let the adult
    # model veto a genuine child's cough and hand the health worker nothing.
    # Since this is a support hint and not a decision, a missed cough costs more
    # than a generous one, and both numbers are reported either way.
    model = load_cough_model()
    cough_probability = None
    if model is not None and samples.size:
        cough_probability = float(
            model.predict_proba(feature_vector(samples, sr).reshape(1, -1))[0][1]
        )
    has_cough = bool(bursts) or (
        cough_probability is not None and cough_probability >= COUGH_PRESENT_THRESHOLD
    )

    # Features over the whole trimmed clip, reported so the analysis is auditable
    coeffs = mfcc(samples, sr)
    mfcc_mean = coeffs.mean(axis=1) if coeffs.shape[1] else np.zeros(N_MFCC, dtype=np.float32)
    delta_mean = deltas(coeffs).mean(axis=1) if coeffs.shape[1] else np.zeros(N_MFCC, dtype=np.float32)
    zcr = zero_crossing_rate(samples)

    if not has_cough or not bursts:
        return {
            "analyzer": "signal-features-v1" if model is None else "signal-features-v1 + cough-detector-v1",
            "trained_model": model is not None,
            "trained_on": None if model is None else "COUGHVID v3 WAV subset (adult-heavy)",
            "cough_probability": None if cough_probability is None else round(cough_probability, 4),
            "calibrated": CALIBRATED,
            "duration_s": duration_s,
            # The true burst count, not a zero. If the energy detector found
            # bursts but the pattern could not be described, saying "0 coughs"
            # would hide what was actually measured.
            "coughs_detected": len(bursts),
            "cough_pattern": "no clear cough",
            "sound_character": "unclear",
            "features": {
                "zero_crossing_rate": round(zcr, 4),
                "mfcc_mean": [round(float(v), 3) for v in mfcc_mean],
                "mfcc_delta_mean": [round(float(v), 3) for v in delta_mean],
            },
        }

    centroids, rolloffs, low_ratios, durations = [], [], [], []
    for start, end in bursts:
        centroid, rolloff, low_ratio = spectrum_stats(samples[start:end], sr)
        centroids.append(centroid)
        rolloffs.append(rolloff)
        low_ratios.append(low_ratio)
        durations.append((end - start) / sr)

    centroid = float(np.mean(centroids))
    rolloff = float(np.mean(rolloffs))
    low_ratio = float(np.mean(low_ratios))
    burst_ms = float(np.mean(durations) * 1000)

    # The share of energy below 1 kHz leads, because it is a ratio and so
    # survives a change of microphone or of distance from the child. Absolute
    # centroid in Hz does not, and is only consulted for the middle band.
    if low_ratio >= LOW_RATIO_WET:
        pattern = "wet"
    elif low_ratio <= LOW_RATIO_DRY:
        pattern = "dry"
    else:
        pattern = "wet" if centroid < CENTROID_TIEBREAK_HZ else "dry"

    # "Abnormal" describes the sound only: energy piled low, the way a
    # productive, secretion-loaded cough sits. It is not a clinical finding and
    # carries no weight in the WHO score.
    character = "abnormal" if pattern == "wet" else "normal"

    return {
        "analyzer": "signal-features-v1" if model is None else "signal-features-v1 + cough-detector-v1",
        "trained_model": model is not None,
        "trained_on": None if model is None else "COUGHVID v3 WAV subset (adult-heavy)",
        "cough_probability": None if cough_probability is None else round(cough_probability, 4),
        "calibrated": CALIBRATED,
        "duration_s": duration_s,
        "coughs_detected": len(bursts),
        "cough_pattern": pattern,
        "sound_character": character,
        "features": {
            "spectral_centroid_hz": round(centroid, 1),
            "spectral_rolloff85_hz": round(rolloff, 1),
            "low_band_energy_ratio": round(low_ratio, 3),
            "mean_burst_ms": round(burst_ms, 1),
            "zero_crossing_rate": round(zcr, 4),
            "mfcc_mean": [round(float(v), 3) for v in mfcc_mean],
            "mfcc_delta_mean": [round(float(v), 3) for v in delta_mean],
        },
    }
