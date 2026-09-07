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
    # 1.png is the only source with no title on it. It is the chest-indrawing
    # sequence - the lower chest wall drawing in on the third panel - not a
    # second picture of respiratory rate, which 2.png is titled for.
    ("1.png", "chest-indrawing", None),
    ("2.png", "respiratory-rate", (0.0, 0.0, 0.565, 1.0)),
]

# The Urdu set, under "urdu assstes". Filenames are export timestamps and say
# nothing about content, so each was opened and matched to its question rather
# than trusted by name or order.
#
# Eight, not ten. Chest indrawing has no text in it at all - four numbered
# photographs and two arrows - so the same file serves both languages and no
# Urdu version was needed. Respiratory rate does carry English text, so it has
# no Urdu counterpart and is simply not shown in Urdu.
URDU_DIR = os.path.join("src", "assets", "urdu assstes")

URDU_GUIDES = [
    ("ChatGPT Image Sep 7, 2026, 06_17_06 PM.png", "seizure"),
    ("ChatGPT Image Sep 7, 2026, 06_19_05 PM.png", "neck-stiffness"),
    ("ChatGPT Image Sep 7, 2026, 06_20_59 PM.png", "dehydration"),
    ("ChatGPT Image Sep 7, 2026, 06_22_37 PM.png", "pallor"),
    ("ChatGPT Image Sep 7, 2026, 06_27_56 PM.png", "muac"),
    ("ChatGPT Image Sep 7, 2026, 06_29_42 PM.png", "stridor"),
    ("ChatGPT Image Sep 7, 2026, 06_32_18 PM.png", "lymph-nodes"),
    ("ChatGPT Image Sep 7, 2026, 06_40_56 PM.png", "breathing-severe"),
]


def convert(src, out, crop=None):
    """One source image to a web-sized WebP. Returns (before, after) bytes."""
    before = os.path.getsize(src)
    image = Image.open(src).convert("RGB")

    if crop:
        w, h = image.size
        left, top, right, bottom = crop
        image = image.crop(
            (int(w * left), int(h * top), int(w * right), int(h * bottom))
        )

    if image.width > MAX_WIDTH:
        ratio = MAX_WIDTH / image.width
        image = image.resize((MAX_WIDTH, round(image.height * ratio)), Image.LANCZOS)

    os.makedirs(os.path.dirname(out), exist_ok=True)
    image.save(out, "WEBP", quality=QUALITY, method=6)
    return before, os.path.getsize(out), image.size


def main():
    before = after = 0

    print("English:")
    for filename, name, crop in GUIDES:
        src = os.path.join(SRC_DIR, filename)
        if not os.path.exists(src):
            print(f"  !! missing {src}")
            continue
        out = os.path.join(OUT_DIR, f"{name}.webp")
        b, a, size = convert(src, out, crop)
        before, after = before + b, after + a
        print(f"  {filename:8s} -> {name + '.webp':26s} "
              f"{size[0]}x{size[1]}  {a / 1024:6.1f} KB")

    print("\nUrdu:")
    for filename, name in URDU_GUIDES:
        src = os.path.join(URDU_DIR, filename)
        if not os.path.exists(src):
            print(f"  !! missing {src}")
            continue
        out = os.path.join(OUT_DIR, "ur", f"{name}.webp")
        b, a, size = convert(src, out)
        before, after = before + b, after + a
        print(f"  {name + '.webp':26s} {size[0]}x{size[1]}  {a / 1024:6.1f} KB")

    print(
        f"\n{len(GUIDES)} English + {len(URDU_GUIDES)} Urdu: "
        f"{before / 1024 / 1024:.1f} MB -> {after / 1024:.0f} KB"
    )


if __name__ == "__main__":
    main()
