"""
Keeping the recordings and films, so a paediatric dataset can exist.

There is no public corpus of under-five cough audio worth training on - 88
recordings in COUGHVID, of which 59 survive quality filtering - and none at all
of paediatric TB chest X-rays. That is the reason the cough feature exists, and
until now the app analysed every capture and threw it away, which made the
claim untrue.

Three rules shape this file, and all three are about not doing harm with a
child's medical data:

Off unless asked for. Collection requires SAANS_COLLECT=1. A clone that someone
runs to look around stores nothing, and cannot start storing by accident.

Consent per capture, not per install. Even with collection enabled, a sample is
kept only when the health worker confirms the carer agreed to this recording.
The switch is off each time; consent to one X-ray is not consent to the next.

Nothing identifying is written. Age in years, the model's own output, and the
screening outcome. No name, no free text, no location, no device id. Filenames
are random, not derived from anything about the child.

Layout, one directory per kind and day:

    backend/data/cough/2026-09-07/<id>.wav
    backend/data/cough/2026-09-07/<id>.json
    backend/data/xray/2026-09-07/<id>.jpg
    backend/data/xray/2026-09-07/<id>.json

The sidecar is what makes a sample trainable: the media alone has no label.
"""
import json
import os
import re
import uuid
from datetime import datetime, timezone

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_DIR = os.environ.get("SAANS_DATA_DIR", os.path.join(_ROOT, "backend", "data"))
COLLECT_ENABLED = os.environ.get("SAANS_COLLECT", "0") == "1"

# A cough is ~320 KB and a film a few MB; this is a stop, not a budget.
MAX_STORE_BYTES = 12 * 1024 * 1024

_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def enabled():
    return COLLECT_ENABLED


def _today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _sidecar_path(kind, sample_id):
    """Locate an existing sidecar without trusting the id to be a path."""
    if not _ID_RE.match(sample_id or ""):
        return None
    root = os.path.join(DATA_DIR, kind)
    if not os.path.isdir(root):
        return None
    for day in sorted(os.listdir(root), reverse=True):
        candidate = os.path.join(root, day, f"{sample_id}.json")
        if os.path.exists(candidate):
            return candidate
    return None


def save(kind, data, extension, analysis=None, age_years=None):
    """
    Keep one capture and its sidecar. Returns the id, or None if not stored.

    Storing must never break a screening: a full disk or a read-only mount
    loses the sample, not the consultation, so failures are swallowed and the
    caller carries on.
    """
    if not COLLECT_ENABLED or not data or len(data) > MAX_STORE_BYTES:
        return None
    if kind not in ("cough", "xray"):
        return None

    sample_id = uuid.uuid4().hex
    folder = os.path.join(DATA_DIR, kind, _today())

    # The heatmap is a megabyte of base64 the model can redraw from the film,
    # and the raw features are already derivable from the audio. Neither is
    # worth keeping beside the thing they were computed from.
    slim = {
        k: v for k, v in (analysis or {}).items()
        if k not in ("heatmap_overlay", "features")
    }

    try:
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, f"{sample_id}.{extension}"), "wb") as fh:
            fh.write(data)
        with open(os.path.join(folder, f"{sample_id}.json"), "w", encoding="utf-8") as fh:
            json.dump({
                "id": sample_id,
                "kind": kind,
                "captured_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "media": f"{sample_id}.{extension}",
                "age_years": age_years,
                "analysis": slim,
                # Filled in later by record_outcome, once the score exists.
                "outcome": None,
            }, fh, indent=2, ensure_ascii=False)
    except OSError:
        return None

    return sample_id


def record_outcome(sample_id, kind, outcome):
    """
    Attach the screening result to a sample already on disk.

    Captures happen before the score exists - a film is read several screens
    before the total is known - so the label arrives second. Without this the
    media is unlabelled and close to useless for training.
    """
    if not COLLECT_ENABLED or not isinstance(outcome, dict):
        return False

    path = _sidecar_path(kind, sample_id)
    if path is None:
        return False

    try:
        with open(path, encoding="utf-8") as fh:
            record = json.load(fh)
        # Only the fields we expect, so a client cannot write arbitrary keys
        # into the dataset.
        record["outcome"] = {
            "algorithm": outcome.get("algorithm"),
            "total": outcome.get("total"),
            "sum_a": outcome.get("sumA"),
            "sum_b": outcome.get("sumB"),
            "treat": outcome.get("treat"),
            "recorded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(record, fh, indent=2, ensure_ascii=False)
    except (OSError, ValueError):
        return False

    return True


def stats():
    """Counts for /api/health, so it is visible whether anything is landing."""
    if not COLLECT_ENABLED:
        return {"enabled": False}

    counts = {}
    for kind in ("cough", "xray"):
        root = os.path.join(DATA_DIR, kind)
        total = labelled = 0
        for day_dir, _, files in os.walk(root):
            for name in files:
                if not name.endswith(".json"):
                    continue
                total += 1
                try:
                    with open(os.path.join(day_dir, name), encoding="utf-8") as fh:
                        if json.load(fh).get("outcome"):
                            labelled += 1
                except (OSError, ValueError):
                    pass
        counts[kind] = {"samples": total, "with_outcome": labelled}
    return {"enabled": True, "dir": DATA_DIR, **counts}
