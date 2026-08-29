"""
Chest X-ray vision service for Saans.

DEMO_MODE = True  -> deterministic stand-in response with a synthetic
                     Grad-CAM-style overlay drawn over the lung fields of the
                     uploaded image. No model weights required.
DEMO_MODE = False -> fine-tuned DenseNet121 (Shenzhen + Montgomery TB
                     datasets) with a real Grad-CAM heatmap. Disabled by
                     default; see load_model() / run_model().
"""

import base64
import io
import os

import numpy as np
from PIL import Image

# Flip to False (or set SAANS_DEMO_MODE=0) once model weights are in place.
DEMO_MODE = os.environ.get("SAANS_DEMO_MODE", "1") != "0"

MODEL_WEIGHTS = os.environ.get(
    "SAANS_CXR_WEIGHTS", os.path.join(os.path.dirname(__file__), "weights", "densenet121_tb.pt")
)

# Working resolution for the overlay we hand back to the client.
OVERLAY_SIZE = (512, 512)

# Demo stand-in values. tb_probability is fixed so the demo is reproducible.
DEMO_TB_PROBABILITY = 0.86
DEMO_CXR_FEATURES = ["opacities", "enlarged lymph nodes"]


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


def load_model():
    """
    Fine-tuned DenseNet121 (Shenzhen + Montgomery TB datasets), binary head.
    Imports torch lazily so the demo path has no torch dependency.
    """
    global _model
    if _model is not None:
        return _model

    import torch
    from torchvision import models

    net = models.densenet121(weights=None)
    net.classifier = torch.nn.Linear(net.classifier.in_features, 2)
    state = torch.load(MODEL_WEIGHTS, map_location="cpu")
    net.load_state_dict(state.get("state_dict", state))
    net.eval()
    _model = net
    return _model


def run_model(image: Image.Image):
    """Inference + real Grad-CAM against the last dense block."""
    import torch
    import torch.nn.functional as F
    from torchvision import transforms

    net = load_model()
    target_layer = net.features.denseblock4

    preprocess = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )
    tensor = preprocess(image.convert("RGB")).unsqueeze(0)

    captured = {}

    def forward_hook(_module, _inp, out):
        captured["activations"] = out.detach()

    def backward_hook(_module, _grad_in, grad_out):
        captured["gradients"] = grad_out[0].detach()

    handles = [
        target_layer.register_forward_hook(forward_hook),
        target_layer.register_full_backward_hook(backward_hook),
    ]

    try:
        logits = net(tensor)
        probs = F.softmax(logits, dim=1)
        tb_index = 1
        tb_probability = float(probs[0, tb_index])

        net.zero_grad()
        logits[0, tb_index].backward()

        activations = captured["activations"][0]
        gradients = captured["gradients"][0]
        weights = gradients.mean(dim=(1, 2), keepdim=True)
        cam = F.relu((weights * activations).sum(dim=0))
        cam = cam / (cam.max() + 1e-9)
        cam_np = cam.cpu().numpy()
    finally:
        for handle in handles:
            handle.remove()

    return tb_probability, cam_np


def suggest_features(tb_probability: float, cam: np.ndarray):
    """
    Map model output to candidate CXR features for the confirmation screen.
    These are suggestions only — the health worker confirms or edits them.
    """
    features = []
    if tb_probability >= 0.5:
        features.append("opacities")
    upper = cam[: cam.shape[0] // 2]
    if float(upper.mean()) > float(cam.mean()):
        features.append("enlarged lymph nodes")
    return features or ["opacities"]


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
        "heatmap_overlay": to_data_url(overlay),
        "suggested_cxr_features": features,
    }
