# backend/models

Trained weights for the Saans chest X-ray triage model.

| file | what it is |
| --- | --- |
| `saans_xray_densenet121.h5` | DenseNet121, TensorFlow/Keras, single sigmoid output = P(TB). ~70 MB, gitignored. |
| `saans_xray_densenet121.json` | Metrics sidecar. `server/vision.py` reads the decision threshold and the Grad-CAM layer from here — do not hand-edit without re-running the numbers. |
| `training_curves.png`, `confusion_matrix.png` | Produced by the training notebook. |

Produced by [`notebooks/train_xray_model_local.ipynb`](../../notebooks/train_xray_model_local.ipynb).
Block 8 copies the files here automatically.

## How it is served

`server/vision.py` runs the real model when the `.h5` is present and falls back to
`DEMO_MODE` when it is not, so a fresh checkout works without the weights. Force
either mode with `SAANS_DEMO_MODE=1` / `SAANS_DEMO_MODE=0`.

The served `.h5` is a **float32** rebuild of the trained network. Training used a
mixed-float16 policy for GPU speed, which is ~22x slower on a CPU server because
float16 is emulated there. Same weights, same predictions, no decision changes.

## Performance, honestly

Test set of 1,990 films the model never saw during training or threshold selection:

| | |
| --- | --- |
| Recall (TB caught) | 0.9509 — 271 of 285 |
| Missed TB | 14 |
| False alarms | 30 of 1,705 healthy films |
| Specificity | 0.982 |
| Pooled ROC AUC | 0.9949 |

**Quote 0.94, not 0.99.** The pooled AUC is inflated. In the Qatar training source
the Normal and TB films come from different collections and differ in appearance
for non-clinical reasons, so the model separates them perfectly (AUC 1.000)
without reading pathology. Shenzhen is the fair comparison — one hospital, one
machine, both classes — and gives **AUC 0.942**, catching 88% of its TB cases. Per-source figures are in the json.

The threshold of **0.71** was chosen for ≥90% recall on Shenzhen rather than on
the pooled set, so it is tuned to the harder, more realistic data.

## Limitations to carry into any write-up

- Trained on **adult** TB CXR datasets as proof-of-concept; paediatric fine-tuning
  is the Phase-1 pilot roadmap item, and Saans screens children under five.
- Chest X-ray is a **triage aid, not a diagnosis**. Bacteriological confirmation
  (Xpert MTB/RIF, culture) remains the diagnostic standard.
- The test set shares sources with training. This is not external validation.
- ~35 near-duplicate films survived cross-source deduplication (~0.26% of data).
- WHO's recommendation on computer-aided TB detection covers ages 15 and over.
