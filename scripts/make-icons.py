"""Draws the Runway OS app icons into public/. Run: python scripts/make-icons.py (needs Pillow).

The mark matches the onboarding badge: a bold "R" on the orange accent, with a thin runway line under it.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
ORANGE = (232, 101, 10)
INK = (24, 13, 2)
CREAM = (250, 246, 240)
FONTS = [r"C:\Windows\Fonts\seguibl.ttf", r"C:\Windows\Fonts\arialbd.ttf"]


def font(px: int) -> ImageFont.FreeTypeFont:
    for f in FONTS:
        if Path(f).exists():
            return ImageFont.truetype(f, px)
    return ImageFont.load_default()


def draw(size: int, *, rounded: bool, safe: float) -> Image.Image:
    """safe = share of the canvas the mark may use (maskable icons need a smaller mark)."""
    scale = 4  # supersample for smooth edges
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=ORANGE)
    else:
        d.rectangle((0, 0, s, s), fill=ORANGE)
    f = font(int(s * 0.62 * safe))
    box = d.textbbox((0, 0), "R", font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    x = (s - w) / 2 - box[0]
    y = (s - h) / 2 - box[1] - s * 0.05 * safe
    d.text((x, y), "R", font=f, fill=INK)
    # runway line
    lw = s * 0.42 * safe
    ly = (s + h) / 2 + s * 0.06 * safe
    d.rounded_rectangle(((s - lw) / 2, ly, (s + lw) / 2, ly + s * 0.035 * safe), radius=int(s * 0.02), fill=CREAM)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw(192, rounded=True, safe=1).save(OUT / "icon-192.png")
    draw(512, rounded=True, safe=1).save(OUT / "icon-512.png")
    draw(512, rounded=False, safe=0.72).save(OUT / "maskable-512.png")
    draw(180, rounded=False, safe=0.9).convert("RGB").save(OUT / "apple-touch-icon.png")
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
