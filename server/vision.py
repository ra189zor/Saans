"""
Chest X-ray vision service for Saans.

DEMO_MODE = False -> fine-tuned DenseNet121 (TensorFlow/Keras) with a real
                     Grad-CAM heatmap. Used automatically when the weights
                     file is present.
DEMO_MODE = True  -> deterministic stand-in response with a synthetic
                     Grad-CAM-style overlay drawn over the lung fields of the
                     uploaded image. No model weights required.

The model is a triage aid, never a diagnosis. It was trained on adult TB chest
X-ray datasets as proof-of-concept; paediatric fine-tuning is the Phase-1 pilot
roadmap item. Its own metadata sidecar records that the headline AUC is inflated
by collection artifacts in one training source; treat ~0.94 as the honest figure.
"""

import base64
import importlib.util
import io
import json
import os
import sys

import numpy as np
from PIL import Image

_MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "models")

MODEL_WEIGHTS = os.environ.get(
    "SAANS_CXR_WEIGHTS", os.path.join(_MODELS_DIR, "saans_xray_densenet121.h5")
)
MODEL_METADATA = os.environ.get(
    "SAANS_CXR_METADATA", os.path.join(_MODELS_DIR, "saans_xray_densenet121.json")
)

# Demo unless SAANS_DEMO_MODE says otherwise; when it is unset, run the real
# model if - and only if - the weights are actually on disk. That keeps a fresh
# checkout working without the 70 MB file, and needs no config once it is there.
_demo_override = os.environ.get("SAANS_DEMO_MODE")
DEMO_MODE = (_demo_override != "0") if _demo_override is not None else not os.path.exists(MODEL_WEIGHTS)

# Weights present but TensorFlow missing means the server was started from the
# wrong Python environment. Say so at startup: left to the lazy import inside
# run_model(), it surfaces once per request as "Could not analyze image", which
# blames the X-ray for what is a setup problem.
if not DEMO_MODE and importlib.util.find_spec("tensorflow") is None:
    raise RuntimeError(
        f"Model weights are present at {MODEL_WEIGHTS}, but TensorFlow is not "
        f"installed in this Python environment ({sys.executable}).\n"
        "Start the server from the environment that has TensorFlow, e.g.\n"
        "    conda activate saans && uvicorn server.app:app --port 8000\n"
        "or set SAANS_DEMO_MODE=1 to run the demo stand-in instead."
    )


def _load_metadata() -> dict:
    try:
        with open(MODEL_METADATA, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


_METADATA = _load_metadata()

# Decision threshold, from the sidecar the training notebook writes. Chosen for
# >=90% recall on same-source validation, not left at an arbitrary 0.5 - missing
# a case costs far more than a false alarm in a screening tool.
TB_THRESHOLD = float(_METADATA.get("threshold", 0.5))

# Input geometry the model was trained at.
MODEL_INPUT_SIZE = tuple(_METADATA.get("input_shape", [224, 224, 3])[:2])
GRADCAM_LAYER = _METADATA.get("gradcam_layer", "conv5_block16_concat")

# Working resolution for the overlay we hand back to the client.
OVERLAY_SIZE = (512, 512)

# Demo stand-in values. tb_probability is fixed so the demo is reproducible.
# Matches the real path: opacities only, never a finding the model cannot see.
DEMO_TB_PROBABILITY = 0.86
DEMO_CXR_FEATURES = ["opacities"]


# --------------------------------------------------------------------------
# Heatmap rendering
# --------------------------------------------------------------------------

def _jet_colormap(values: np.ndarray) -> np.ndarray:
    """Map values in [0,1] to a jet-like RGB ramp without pulling in matplotlib."""
    v = np.clip(values, 0.0, 1.0)
    four = 4.0 * v
    r = np.clip(np.minimum(four - 1.5, -four + 4.5), 0.0, 1.0)
    g = np.clip(np.minimum(four - 0.5, -four + 3.5), 0.0, 1.0)
    b = np.clip(np.minimum(four + 0.5, -four + 2.5), 0.0, 1.0)
    return np.stack([r, g, b], axis=-1)


def _gaussian(h: int, w: int, cy: float, cx: float, sy: float, sx: float) -> np.ndarray:
    yy = np.linspace(0.0, 1.0, h)[:, None]
    xx = np.linspace(0.0, 1.0, w)[None, :]
    return np.exp(-(((yy - cy) ** 2) / (2 * sy**2) + ((xx - cx) ** 2) / (2 * sx**2)))


def _demo_activation(h: int, w: int) -> np.ndarray:
    """
    Demo overlay stand-in; real Grad-CAM enabled when model loaded.

    Two activation blobs placed over the upper/mid lung fields, plus a weak
    diffuse term, so the overlay reads like a plausible attention map rather
    than a flat blur.
    """
    cam = (
        1.00 * _gaussian(h, w, cy=0.38, cx=0.33, sy=0.13, sx=0.10)
        + 0.72 * _gaussian(h, w, cy=0.47, cx=0.68, sy=0.11, sx=0.09)
        + 0.30 * _gaussian(h, w, cy=0.30, cx=0.62, sy=0.08, sx=0.07)
        + 0.12 * _gaussian(h, w, cy=0.50, cx=0.50, sy=0.30, sx=0.28)
    )

    # Light structured noise keeps it from looking like clean geometry.
    rng = np.random.default_rng(seed=7)
    noise = rng.normal(0.0, 1.0, size=(h // 16 + 1, w // 16 + 1))
    noise_img = np.asarray(
        Image.fromarray(((noise - noise.min()) / (np.ptp(noise) + 1e-9) * 255).astype(np.uint8))
        .resize((w, h), Image.BICUBIC)
    ).astype(np.float32) / 255.0
    cam = cam * (0.88 + 0.12 * noise_img)

    # Suppress the border region so activation sits inside the chest, not the frame.
    cam *= _gaussian(h, w, cy=0.45, cx=0.5, sy=0.34, sx=0.32)

    span = float(cam.max() - cam.min())
    return (cam - cam.min()) / (span + 1e-9)


def blend_heatmap(image: Image.Image, activation: np.ndarray, alpha: float = 0.45) -> Image.Image:
    """Blend a [0,1] activation map over the image using a jet colour ramp."""
    base = image.convert("RGB").resize(OVERLAY_SIZE, Image.BICUBIC)
    base_arr = np.asarray(base).astype(np.float32) / 255.0

    if activation.shape != OVERLAY_SIZE[::-1]:
        activation = np.asarray(
            Image.fromarray((activation * 255).astype(np.uint8)).resize(
                OVERLAY_SIZE, Image.BICUBIC
            )
        ).astype(np.float32) / 255.0

    heat = _jet_colormap(activation)
    # Fade the overlay out where activation is low so the film stays readable.
    mask = (activation**1.5)[..., None] * alpha
    blended = base_arr * (1.0 - mask) + heat * mask
    return Image.fromarray((np.clip(blended, 0.0, 1.0) * 255).astype(np.uint8))


def to_data_url(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


# --------------------------------------------------------------------------
# Real model path — inactive while DEMO_MODE is True
# --------------------------------------------------------------------------

_model = None


_grad_model = None


def load_model():
    """
    Fine-tuned DenseNet121 with a single sigmoid head, as produced by
    notebooks/train_xray_model_local.ipynb. TensorFlow is imported lazily so the
    demo path never pays for it.
    """
    global _model
    if _model is not None:
        return _model

    import tensorflow as tf

    if not os.path.exists(MODEL_WEIGHTS):
        raise FileNotFoundError(
            f"No model weights at {MODEL_WEIGHTS}. Train them with "
            "notebooks/train_xray_model_local.ipynb, or set SAANS_DEMO_MODE=1."
        )

    _model = tf.keras.models.load_model(MODEL_WEIGHTS, compile=False)
    return _model


def _get_grad_model():
    """Twin of the model that also returns the last conv feature maps, built once."""
    global _grad_model
    if _grad_model is None:
        import tensorflow as tf

        net = load_model()
        _grad_model = tf.keras.models.Model(
            net.inputs, [net.get_layer(GRADCAM_LAYER).output, net.output]
        )
    return _grad_model


def _preprocess(image: Image.Image) -> np.ndarray:
    """RGB, resized to the training geometry, scaled exactly as training did."""
    from tensorflow.keras.applications.densenet import preprocess_input

    resized = image.convert("RGB").resize(MODEL_INPUT_SIZE, Image.BILINEAR)
    return preprocess_input(np.asarray(resized, dtype="float32")[None, ...])


def run_model(image: Image.Image):
    """Inference + real Grad-CAM against the last dense block."""
    import tensorflow as tf

    net = load_model()
    batch = _preprocess(image)

    tb_probability = float(net.predict(batch, verbose=0)[0][0])

    # Grad-CAM on the TB logit rather than the sigmoid output: once the model is
    # confident the sigmoid saturates and its gradient vanishes, which would hand
    # back a blank heatmap on exactly the films worth looking at.
    head = net.get_layer("tb_output")
    saved_activation = head.activation
    head.activation = tf.keras.activations.linear
    try:
        grad_model = _get_grad_model()
        with tf.GradientTape() as tape:
            conv_out, logit = grad_model(batch, training=False)
            score = logit[:, 0]
        grads = tape.gradient(score, conv_out)
        if grads is None:
            raise RuntimeError("no gradient reached " + GRADCAM_LAYER)

        # The trained model carries a mixed-float16 policy; Grad-CAM maths runs
        # in float32 so the small gradients do not underflow.
        conv_out = tf.cast(conv_out, tf.float32)
        grads = tf.cast(grads, tf.float32)

        weights = tf.reduce_mean(grads, axis=(1, 2))
        cam = tf.nn.relu(tf.einsum("bhwc,bc->bhw", conv_out, weights)[0])
        cam = cam / (tf.reduce_max(cam) + 1e-8)
        cam_np = cam.numpy()
    finally:
        head.activation = saved_activation

    return tb_probability, cam_np


def suggest_features(tb_probability: float, cam: np.ndarray):
    """
    Map model output to candidate CXR features for the confirmation screen.
    These are suggestions only — the health worker confirms or edits them.

    Below the threshold nothing is suggested. The screen pre-ticks whatever comes
    back, and pre-ticking a finding on a film the model scored as clearly normal
    pushes the health worker toward a finding the model did not make.
    """
    if tb_probability < TB_THRESHOLD:
        return []

    # Only "opacities" (+5 in Algorithm A), and deliberately nothing else.
    #
    # The model has a single output - P(TB). It was never trained to tell one
    # CXR feature from another, so it cannot report which finding it saw. An
    # earlier version inferred "enlarged lymph nodes" from the upper half of the
    # Grad-CAM being warmer than average; that is worth +17, above the >10
    # treatment threshold on its own, and would have started a child on six
    # months of TB treatment on the strength of a heatmap average.
    #
    # Enlarged lymph nodes is the most important paediatric finding, so the
    # confirmation screen prompts the health worker to look for it instead.
    # Restoring the suggestion needs a multi-label feature detector trained on
    # paediatric films - a Phase-2 item, not a heuristic.
    _ = cam  # kept in the signature for when that model exists
    return ["opacities"]


# --------------------------------------------------------------------------
# Entry point used by the API layer
# --------------------------------------------------------------------------

def analyze(image_bytes: bytes) -> dict:
    image = Image.open(io.BytesIO(image_bytes))
    image.load()

    if DEMO_MODE:
        activation = _demo_activation(*OVERLAY_SIZE[::-1])
        tb_probability = DEMO_TB_PROBABILITY
        features = list(DEMO_CXR_FEATURES)
    else:
        tb_probability, activation = run_model(image)
        features = suggest_features(tb_probability, activation)

    overlay = blend_heatmap(image, activation)

    return {
        "demo_mode": DEMO_MODE,
        "tb_probability": round(float(tb_probability), 4),
        # The client shows the probability, but any yes/no call belongs to this
        # threshold, not to 0.5.
        "threshold": round(TB_THRESHOLD, 4),
        "tb_suspect": bool(tb_probability >= TB_THRESHOLD),
        "heatmap_overlay": to_data_url(overlay),
        "suggested_cxr_features": features,
    }
