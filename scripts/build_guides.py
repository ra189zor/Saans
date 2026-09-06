"""
Turn the source guide artwork into web assets the app can ship.

The originals are 1.5-2.3 MB PNGs, roughly 17 MB for the set. That is far too
much for an app meant to be installed over a slow connection and precached for
offline use, so each one is resized and re-encoded as WebP - about 35x smaller
with no visible loss at the sizes they are displayed.

Output names say which question the picture explains. The source files are
numbered, and the numbers do not line up with the app's question order, so the
mapping below was made by looking at each image rather than by its filename.

Run: python scripts/build_guides.py
"""
import os

from PIL import Image

SRC_DIR = os.path.join("src", "assets")
OUT_DIR = os.path.join("src", "assets", "guides")

MAX_WIDTH = 1400        # enough to stay readable zoomed in on a phone
QUALITY = 78

# source file -> (output name, crop box as fractions or None)
#
# 2.png carries a mockup of a phone with a white keypad down its right-hand
# side. Saans is a dark UI, and a picture of a different app inside this one
# reads as a bug, so that side is cropped away and only the instruction kept.
GUIDES = [
    ("15.png", "seizure", None),
    ("3.png", "stridor", None),
    ("6.png", "dehydration", None),
    ("5.png", "pallor", None),
    ("7.png", "neck-stiffness", None),
    ("8.png", "breathing-severe", None),
    ("4.png", "muac", None),
    ("16.png", "lymph-nodes", None),
    # Two pictures for one field: the four-panel sequence is the technique
    # (watch the chest rise and fall), the other names the task.
    ("1.png", "respiratory-rate", None),
    ("2.png", "respiratory-rate-detail", (0.0, 0.0, 0.565, 1.0)),
]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    before = after = 0

    for filename, name, crop in GUIDES:
        src = os.path.join(SRC_DIR, filename)
        if not os.path.exists(src):
            print(f"  !! missing {src}")
            continue

        before += os.path.getsize(src)
        image = Image.open(src).convert("RGB")

        if crop:
            w, h = image.size
            left, top, right, bottom = crop
            image = image.crop(
                (int(w * left), int(h * top), int(w * right), int(h * bottom))
            )

        if image.width > MAX_WIDTH:
            ratio = MAX_WIDTH / image.width
            image = image.resize(
                (MAX_WIDTH, round(image.height * ratio)), Image.LANCZOS
            )

        out = os.path.join(OUT_DIR, f"{name}.webp")
        image.save(out, "WEBP", quality=QUALITY, method=6)
        after += os.path.getsize(out)

        print(
            f"  {filename:8s} -> {name + '.webp':26s} "
            f"{image.width}x{image.height}  {os.path.getsize(out) / 1024:6.1f} KB"
        )

    print(
        f"\n{len(GUIDES)} guides: {before / 1024 / 1024:.1f} MB -> "
        f"{after / 1024:.0f} KB"
    )


if __name__ == "__main__":
    main()
