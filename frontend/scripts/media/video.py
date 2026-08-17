"""Renders the two hero loops frame by frame, in the same drafting language as the stills."""
import os, math
from PIL import Image, ImageDraw, ImageFont

OUT = "/sessions/modest-serene-darwin/mnt/outputs/gen/frames"
BG = (11, 18, 32)
INK = (255, 255, 255)
ACC = (56, 189, 248)
ACC2 = (37, 99, 235)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def f(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size)

def rgba(c, a):
    return (c[0], c[1], c[2], int(255 * a))

def ease(t):
    return 1 - pow(1 - min(max(t, 0), 1), 3)

def seg(t, a, b):
    """progress of a sub-animation running from a to b within 0..1"""
    if b <= a: return 1.0
    return ease((t - a) / (b - a))

def grid(d, w, h, step=44):
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=rgba(INK, .045), width=1)
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=rgba(INK, .045), width=1)
    for x in range(0, w, step * 4):
        d.line([(x, 0), (x, h)], fill=rgba(INK, .075), width=1)
    for y in range(0, h, step * 4):
        d.line([(0, y), (w, y)], fill=rgba(INK, .075), width=1)

def text(d, xy, s, size=13, a=.6, bold=False, anchor="la", spacing=0):
    if spacing:
        x, y = xy
        fnt = f(size, bold)
        for ch in s:
            d.text((x, y), ch, font=fnt, fill=rgba(INK, a), anchor="la")
            x += d.textlength(ch, font=fnt) + spacing
        return
    d.text(xy, s, font=f(size, bold), fill=rgba(INK, a), anchor=anchor)

def dim_h(d, x1, x2, y, s, a=.4):
    d.line([(x1, y), (x2, y)], fill=rgba(INK, a), width=1)
    d.line([(x1, y - 5), (x1, y + 5)], fill=rgba(INK, a), width=1)
    d.line([(x2, y - 5), (x2, y + 5)], fill=rgba(INK, a), width=1)
    text(d, ((x1 + x2) / 2, y - 20), s, 12, .5, anchor="ma")

# ------------------------------------------------------------------ hero loop
def hero_frame(t, w, h):
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img, "RGBA")
    grid(d, w, h)
    d.rectangle([16, 16, w - 17, h - 17], outline=rgba(INK, .16))

    base = int(h * .78)
    left = int(w * .20)
    span = int(w * .52)
    cols = 5
    gap = span // (cols - 1)
    colh = int(h * .48)

    # ground
    d.line([(int(w * .07), base), (w - int(w * .07), base)], fill=rgba(INK, .5), width=2)
    for x in range(int(w * .07), w - int(w * .07), 16):
        d.line([(x, base), (x - 10, base + 12)], fill=rgba(INK, .11), width=1)

    # columns draw upward
    for i in range(cols):
        p = seg(t, .05 + i * .04, .38 + i * .04)
        x = left + i * gap
        ch = int(colh * p)
        if ch > 2:
            d.rectangle([x, base - ch, x + 14, base], fill=rgba(INK, .12), outline=rgba(INK, .45))

    # slabs sweep in
    for k, sy in enumerate([base - int(colh * .34), base - int(colh * .67), base - colh]):
        p = seg(t, .30 + k * .07, .58 + k * .07)
        if p > 0:
            d.rectangle([left - 14, sy, left - 14 + int((span + 42) * p), sy + 9],
                        fill=rgba(INK, .2), outline=rgba(INK, .5))

    # rising rule
    p = seg(t, .48, .8)
    pts = [(left + 20, base - 20), (left + 20, base - int(colh * .34)),
           (left + gap + 20, base - int(colh * .34)), (left + gap + 20, base - int(colh * .67)),
           (left + 2 * gap + 20, base - int(colh * .67)), (left + 2 * gap + 20, base - colh - 20)]
    total = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    walked = total * p
    acc = 0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        L = math.dist(a, b)
        if acc + L <= walked:
            d.line([a, b], fill=rgba(ACC, .9), width=4)
        elif acc < walked:
            r = (walked - acc) / L
            d.line([a, (a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r)], fill=rgba(ACC, .9), width=4)
        acc += L

    # sweeping dimension
    sweep = (math.sin(t * math.pi * 2 - math.pi / 2) + 1) / 2
    sx = left + int(sweep * (span - gap))
    dim_h(d, sx, sx + gap, base + 46, "3 600", .5)

    # overall dimension after the frame is up
    if t > .62:
        dim_h(d, left, left + span, base + 96, "18 000 OVERALL", min((t - .62) * 4, .45))

    # estimate rows on the right
    rx = int(w * .74)
    rows = [("Excavation", "6,624"), ("Concrete C25", "24,794"), ("Reinforcement", "20,563"),
            ("Masonry labour", "3,542"), ("Hardcore filling", "5,382")]
    text(d, (rx, int(h * .20)), "ESTIMATE  FOUNDATION", 12, .45, spacing=1.6)
    d.line([(rx, int(h * .225)), (w - int(w * .07), int(h * .225))], fill=rgba(INK, .3))
    for i, (name, amt) in enumerate(rows):
        p = seg(t, .18 + i * .07, .34 + i * .07)
        if p <= 0: continue
        y = int(h * .27) + i * int(h * .075)
        text(d, (rx, y), name, 15, .8 * p)
        text(d, (w - int(w * .07), y), amt, 15, .9 * p, anchor="ra")
        d.line([(rx, y + 22), (w - int(w * .07), y + 22)], fill=rgba(INK, .1 * p))

    # counting total
    cp = seg(t, .55, .92)
    total_value = 489100 * cp
    text(d, (rx, int(h * .72)), "DIRECT COST", 12, .45, spacing=1.6)
    text(d, (w - int(w * .07), int(h * .745)), f"GHS {total_value:,.0f}", 30, .95, bold=True, anchor="ra")

    # header
    text(d, (int(w * .07), int(h * .09)), "ELEVATION  SOUTH", 13, .5, spacing=1.8)
    text(d, (int(w * .07), int(h * .125)), "SCALE 1:100", 11, .3, spacing=1.6)

    # fade at the loop seam
    if t > .93:
        k = (t - .93) / .07
        img = Image.blend(img, Image.new("RGB", (w, h), BG), k * .85)
    if t < .05:
        k = 1 - t / .05
        img = Image.blend(img, Image.new("RGB", (w, h), BG), k * .85)
    return img

# --------------------------------------------------------------- product loop
def product_frame(t, w, h):
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img, "RGBA")
    grid(d, w, h)
    d.rectangle([16, 16, w - 17, h - 17], outline=rgba(INK, .16))

    # plan on the left, measured
    px, py = int(w * .08), int(h * .24)
    pw, ph = int(w * .40), int(h * .50)
    d.rectangle([px, py, px + pw, py + ph], outline=rgba(INK, .45))
    d.line([(px + pw * .5, py), (px + pw * .5, py + ph)], fill=rgba(INK, .25))
    d.line([(px, py + ph * .55), (px + pw, py + ph * .55)], fill=rgba(INK, .25))
    for i in range(0, int(pw * .5), 18):
        d.line([(px + i, py), (px + i - int(ph * .55), py + int(ph * .55))], fill=rgba(INK, .07))

    # measuring outline
    p = seg(t, .05, .45)
    per = [(px, py), (px + pw, py), (px + pw, py + ph), (px, py + ph), (px, py)]
    total = sum(math.dist(per[i], per[i + 1]) for i in range(4))
    walked, acc = total * p, 0
    for i in range(4):
        a, b = per[i], per[i + 1]
        L = math.dist(a, b)
        if acc + L <= walked:
            d.line([a, b], fill=rgba(ACC, .85), width=3)
        elif acc < walked:
            r = (walked - acc) / L
            d.line([a, (a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r)], fill=rgba(ACC, .85), width=3)
        acc += L
    dim_h(d, px, px + pw, py + ph + 46, f"{180 * seg(t, .1, .5):.0f} m² MEASURED", .5)

    # quantities land on the right
    rx = int(w * .58)
    text(d, (rx, int(h * .20)), "QUANTITIES → PRICE BOOK", 12, .45, spacing=1.6)
    d.line([(rx, int(h * .225)), (w - int(w * .07), int(h * .225))], fill=rgba(INK, .3))
    rows = [("60×60 porcelain tile", "198 m²", "132.00"), ("Tile adhesive", "40 bag", "78.00"),
            ("Tile grout", "11 bag", "42.00"), ("Tiling labour", "180 m²", "45.00"),
            ("Transport", "2 trip", "1,450.00")]
    for i, (a, q, r) in enumerate(rows):
        pr = seg(t, .30 + i * .08, .48 + i * .08)
        if pr <= 0: continue
        y = int(h * .27) + i * int(h * .085)
        text(d, (rx, y), a, 15, .8 * pr)
        text(d, (rx + int(w * .21), y), q, 13, .45 * pr, anchor="ra")
        text(d, (w - int(w * .07), y), r, 15, .9 * pr, anchor="ra")
        d.line([(rx, y + 22), (w - int(w * .07), y + 22)], fill=rgba(INK, .1 * pr))
    text(d, (rx, int(h * .78)), "EVERY RATE FROM YOUR OWN PRICE BOOK", 11, .4, spacing=1.6)

    if t > .93:
        img = Image.blend(img, Image.new("RGB", (w, h), BG), (t - .93) / .07 * .85)
    if t < .05:
        img = Image.blend(img, Image.new("RGB", (w, h), BG), (1 - t / .05) * .85)
    return img

def render(name, fn, w, h, seconds=9, fps=24):
    folder = os.path.join(OUT, name)
    os.makedirs(folder, exist_ok=True)
    n = seconds * fps
    for i in range(n):
        fn(i / n, w, h).save(os.path.join(folder, f"{i:04d}.png"))
    print("frames", name, n)

if __name__ == "__main__":
    render("home-hero", hero_frame, 1440, 617)
    render("product-hero", product_frame, 1440, 617)
