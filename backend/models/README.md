# backend/models

Drop the trained chest X-ray weights here.

| file | produced by | notes |
| --- | --- | --- |
| `saans_xray_densenet121.h5` | [`notebooks/train_xray_model.ipynb`](../../notebooks/train_xray_model.ipynb) block 5 | Keras/TF full model: DenseNet121 backbone, single sigmoid = P(TB) |
| `saans_xray_densenet121.json` | same notebook, block 5 | metrics sidecar: val accuracy/precision/recall/AUC, threshold, Grad-CAM layer |

Get the `.h5` out of Colab with the notebook's block 8 (`files.download`), or via
the folder icon in Colab's left sidebar -> three dots next to the file -> Download.

Scope note carried over from the notebook: trained on adult TB CXR datasets as
proof-of-concept; paediatric fine-tuning is the Phase-1 pilot roadmap item.

Integration: `server/vision.py` currently loads PyTorch weights
(`densenet121_tb.pt`). Using this `.h5` means switching `load_model()` /
`run_model()` there to `tf.keras.models.load_model()` plus the Grad-CAM from
notebook block 6.

Weights are gitignored (see the repo `.gitignore`) - they are too large for git
without LFS.
