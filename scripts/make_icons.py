"""
Generate the Saans app icons from the LungMark already used in the app.

The paths below are the same cubic curves as the <svg> in
src/screens/WelcomeScreen.jsx, on the same 64-unit grid, so the home-screen
icon and the mark on the welcome screen are one shape rather than two similar
ones. If that SVG changes, change these to match.

Strokes are drawn by stamping overlapping circles along each curve rather than
with ImageDraw.line(joint="curve"), which visibly serrates on tight bends.
Stamping gives round caps and round joins for free, which is what the SVG
asks for.
"""
import os

from PIL import Image, ImageDraw

OUT_DIR = os.path.join("public", "icons")
GRID = 64                       # the SVG viewBox
SS = 32                         # supersample: renders the mark at 2048 px

CANVAS = (11, 15, 14, 255)      # #0B0F0E - the app background
TEAL = (23, 179, 163, 255)      # brightened from #0F766E so it holds at 48 px

# Heavier than the 2.5 the app uses: an icon is seen at 48 px on a home
# screen, where the in-app mark is never smaller than 44 px.
STROKE = 3.6

TRACHEA = [(32, 12), (32, 30)]

# (control1, control2, endpoint) per cubic segment, starting from (32, 22).
LUNG = [
    ((28.5, 18.0), (23.0, 17.5), (19.5, 20.5)),
    ((15.0, 24.5), (13.0, 32.0), (13.5, 40.5)),
    ((13.8, 45.5), (16.0, 49.0), (20.0, 49.5)),
    ((24.5, 50.1), (28.0, 47.0), (29.5, 42.0)),
    ((30.5, 38.5), (31.0, 34.5), (31.0, 31.0)),
]
LUNG_START = (32.0, 22.0)


def cubic(p0, c1, c2, p3, steps=90):
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        out.append((
            u**3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t**3 * p3[1],
        ))
    return out


def mirror(point):
    return (GRID - point[0], point[1])


def stamp(draw, points, radius, fill):
    """Overlapping circles: a stroke with round caps and no joint artefacts."""
    for x, y in points:
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=fill)


def build_mark(scale, stroke):
    """The lung mark on a transparent layer, cropped tight to its own bounds."""
    size = GRID * scale
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    radius = stroke * scale / 2

    def S(points):
        return [(x * scale, y * scale) for x, y in points]

    stamp(draw, S(cubic(TRACHEA[0], TRACHEA[0], TRACHEA[1], TRACHEA[1], 40)),
          radius, TEAL)

    for flip in (False, True):
        cursor = mirror(LUNG_START) if flip else LUNG_START
        for c1, c2, end in LUNG:
            if flip:
                c1, c2, end = mirror(c1), mirror(c2), mirror(end)
            stamp(draw, S(cubic(cursor, c1, c2, end)), radius, TEAL)
            cursor = end

    return layer.crop(layer.getbbox())


def render(size, fraction, stroke=STROKE):
    """One square icon, mark auto-centred and scaled to `fraction` of the side."""
    big = size * 4
    image = Image.new("RGBA", (big, big), CANVAS)

    mark = build_mark(SS, stroke)
    target = big * fraction
    ratio = min(target / mark.width, target / mark.height)
    mark = mark.resize(
        (max(1, round(mark.width * ratio)), max(1, round(mark.height * ratio))),
        Image.LANCZOS,
    )

    image.alpha_composite(mark, ((big - mark.width) // 2, (big - mark.height) // 2))
    return image.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    jobs = [
        ("icon-192.png", 192, 0.64),
        ("icon-512.png", 512, 0.64),
        # Android crops maskable icons to an arbitrary shape and only the inner
        # 80% is guaranteed visible, so the mark is pulled in further.
        ("maskable-512.png", 512, 0.48),
        ("apple-touch-icon.png", 180, 0.64),
    ]
    for name, size, fraction in jobs:
        path = os.path.join(OUT_DIR, name)
        render(size, fraction).save(path)
        print(f"  {name:24s} {size}x{size}  {os.path.getsize(path) / 1024:6.1f} KB")

    # A 16 px favicon needs a heavier stroke or the outline disappears.
    ico = os.path.join("public", "favicon.ico")
    render(256, 0.74, stroke=5.0).save(
        ico, sizes=[(16, 16), (32, 32), (48, 48), (256, 256)]
    )
    print(f"  {'favicon.ico':24s} multi     {os.path.getsize(ico) / 1024:6.1f} KB")


if __name__ == "__main__":
    main()
