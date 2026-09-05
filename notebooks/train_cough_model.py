"""
Train the Saans cough / non-cough detector, and measure it on children.

    conda activate saans
    python notebooks/train_cough_model.py

WHAT IT LEARNS
--------------
One thing only: does this recording contain a cough? Not wet vs dry, and
certainly not tuberculosis. The WHO criterion for cough is that it has lasted
more than two weeks (Module 5, p95) - a history the health worker takes, which
no recording can measure.

THE AGE PROBLEM, AND WHAT IS DONE ABOUT IT
------------------------------------------
Saans screens children under five. COUGHVID is crowdsourced and adult-heavy:
median age 35, and just 88 of its 34,434 recordings are from under-fives. There
is no public cough dataset for that age band - the paediatric cough work in the
literature (Abeyratne et al. and successors) uses study data that was never
released.

88 recordings cannot train a model. They can test one. So:

  * every recording from someone under 18 is held out of training entirely
  * the model is fitted on adults only
  * it is then scored separately on adults, on under-18s, on under-12s and on
    under-5s, and all four numbers go into the metadata

That turns an unavoidable weakness into a measurement. If the adult-trained
model scores well on children, adult training transfers and we know by how much.
If it does not, the honest move is to drop it and keep the energy-based burst
detector in server/audio.py, which has no age bias by construction - it keys on
the shape of a sound, not its pitch.

DECODING
--------
COUGHVID ships .webm, .ogg and .wav, and about 1,400 of the ".wav" files are
actually MP4/AAC saved with the wrong extension by iOS browsers. Everything is
decoded through ffmpeg to 16 kHz mono PCM and then read with the standard
library, so one code path handles all of it and the features match what
server/audio.py computes at serving time.
"""

import json
import os
import subprocess
import sys
import time

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, confusion_matrix, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import audio  # noqa: E402  - feature code shared with the server

DATA = os.path.join(r"D:\saans_data\coughvid", "public_dataset_v3", "coughvid_20211012")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "models")
SEED = 42

COUGH_MIN = 0.8       # cough_detected at or above this -> label 1
NON_COUGH_MAX = 0.2   # at or below this -> label 0; the ambiguous middle is dropped
ADULT_FROM = 18
ADULT_SAMPLE = 7000   # enough to train on; decoding every adult clip is not worth the hours


def _ffmpeg_exe():
    """
    The static binary that ships with imageio-ffmpeg.

    Not conda's ffmpeg: on Windows that pulls a GTK dependency chain whose DLLs
    fail to load, and the executable then exits 0 having produced nothing, which
    looks like a decode failure on every single file.
    """
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


FFMPEG = _ffmpeg_exe()


def decode(path):
    """Any container -> (float32 mono 16 kHz, sr). One path for wav, webm, ogg, mp4."""
    proc = subprocess.run(
        [FFMPEG, "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(audio.TARGET_SR),
         "-f", "wav", "-"],
        capture_output=True,
    )
    if proc.returncode != 0 or not proc.stdout:
        raise RuntimeError("ffmpeg could not decode")
    return audio.read_wav(proc.stdout)


def build_table():
    df = pd.read_csv(os.path.join(DATA, "metadata_compiled.csv"), low_memory=False)
    df["cd"] = pd.to_numeric(df["cough_detected"], errors="coerce")
    df["age_num"] = pd.to_numeric(df["age"], errors="coerce")

    def find(uuid):
        for ext in (".wav", ".webm", ".ogg"):
            p = os.path.join(DATA, f"{uuid}{ext}")
            if os.path.exists(p):
                return p
        return None

    df["path"] = df["uuid"].astype(str).map(find)
    df = df[df["path"].notna()].copy()

    df = df[(df["cd"] >= COUGH_MIN) | (df["cd"] <= NON_COUGH_MAX)].copy()
    df["label"] = (df["cd"] >= COUGH_MIN).astype(int)

    children = df[df["age_num"] < ADULT_FROM].copy()          # every child, held out
    adults = df[df["age_num"] >= ADULT_FROM].copy()
    if len(adults) > ADULT_SAMPLE:
        adults = adults.groupby("label", group_keys=False).apply(
            lambda g: g.sample(min(len(g), ADULT_SAMPLE // 2), random_state=SEED)
        )
    return adults, children


def extract(df, tag):
    X, y, ages, failures = [], [], [], 0
    started = time.time()
    for n, row in enumerate(df.itertuples(), start=1):
        try:
            samples, sr = decode(row.path)
            samples, sr = audio.preprocess(samples, sr)
            if samples.size < sr // 4:
                failures += 1
                continue
            X.append(audio.feature_vector(samples, sr))
            y.append(row.label)
            ages.append(row.age_num)
        except Exception:
            failures += 1
        if n % 500 == 0:
            print(f"  [{tag}] {n}/{len(df)}  ({time.time() - started:.0f}s)", flush=True)
    print(f"  [{tag}] usable {len(X)} / {len(df)}  (undecodable or silent: {failures})")
    return np.array(X), np.array(y), np.array(ages, dtype=float)


def score(model, X, y, label):
    if len(y) == 0 or len(np.unique(y)) < 2:
        return {"n": int(len(y)), "note": "too few or single-class, not scored"}
    prob = model.predict_proba(X)[:, 1]
    pred = (prob >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred).ravel()
    out = {
        "n": int(len(y)),
        "n_cough": int(y.sum()),
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "precision": round(float(precision_score(y, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y, pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y, prob)), 4),
        "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
    }
    print(f"  {label:<22} n={out['n']:<6} acc={out['accuracy']:<8} "
          f"recall={out['recall']:<8} auc={out['roc_auc']}")
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    adults, children = build_table()
    print(f"adults sampled for training: {len(adults)}  (cough {int(adults['label'].sum())})")
    print(f"children held out entirely:  {len(children)}  (cough {int(children['label'].sum())})")
    for cut in (18, 12, 5):
        print(f"    under {cut:<3} {int((children['age_num'] < cut).sum())}")

    print("\ndecoding + features (ffmpeg -> shared server/audio.py code) ...")
    Xa, ya, _ = extract(adults, "adults")
    Xc, yc, ages_c = extract(children, "children")

    X_train, X_test, y_train, y_test = train_test_split(
        Xa, ya, test_size=0.2, random_state=SEED, stratify=ya
    )
    print(f"\ntrain {len(y_train)} adults | adult test {len(y_test)} | child test {len(yc)}")

    model = RandomForestClassifier(
        n_estimators=300, max_depth=18, min_samples_leaf=2,
        class_weight="balanced", random_state=SEED, n_jobs=-1,
    )
    started = time.time()
    model.fit(X_train, y_train)
    print(f"trained in {time.time() - started:.1f}s on adults only\n")

    print("SCORES")
    results = {"adults_heldout": score(model, X_test, y_test, "adults (held out)")}
    for cut in (18, 12, 5):
        m = ages_c < cut
        if m.sum():
            results[f"children_under_{cut}"] = score(model, Xc[m], yc[m], f"children under {cut}")

    order = np.argsort(model.feature_importances_)[::-1][:8]
    print("\nmost important features:")
    for i in order:
        print(f"  {audio.FEATURE_NAMES[i]:<20} {model.feature_importances_[i]:.4f}")

    import joblib
    # compress=3: a 300-tree forest is ~13 MB raw and about a third of that
    # compressed, at no cost to load time that matters here.
    joblib.dump({"model": model, "feature_names": audio.FEATURE_NAMES},
                os.path.join(OUT, "cough_detector.joblib"), compress=3)

    meta = {
        "task": "cough vs non-cough",
        "not_a_tb_model": (
            "Detects whether a recording contains a cough. It says nothing about "
            "tuberculosis. The WHO cough criterion is duration over two weeks, "
            "taken as history by the health worker."
        ),
        "model": "RandomForestClassifier(n_estimators=300, max_depth=18)",
        "features": audio.FEATURE_NAMES,
        "dataset": "COUGHVID v3 (all containers, decoded via ffmpeg)",
        "label_source": (
            "COUGHVID 'cough_detected' - the authors' own published cough "
            "classifier, not human annotation"
        ),
        "trained_on": f"adults only (age >= {ADULT_FROM}); every child held out of training",
        "n_train_adults": int(len(y_train)),
        "results": results,
        "why_this_split": (
            "Saans screens under-fives and COUGHVID has only 88 recordings from "
            "that age band - too few to train on, enough to test on. Training on "
            "adults and testing on children measures the age gap instead of "
            "hiding it."
        ),
    }
    with open(os.path.join(OUT, "cough_detector.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2)
    print(f"\nsaved -> {os.path.join(OUT, 'cough_detector.joblib')}")


if __name__ == "__main__":
    main()
