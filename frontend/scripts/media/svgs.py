"""Generates the public-site illustrations: technical drawings on a deep navy ground."""
import os, math, random

OUT = "/sessions/modest-serene-darwin/mnt/exams/frontend/public/media"
INK, ACC, ACC2 = "#FFFFFF", "#38BDF8", "#2563EB"
BG = "#0B1220"

def head(w, h, extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'role="img" aria-hidden="true">{extra}')

def ground(w, h, step=48):
    g = [f'<rect width="{w}" height="{h}" fill="{BG}"/>']
    g.append(f'<g stroke="{INK}" stroke-opacity=".055" stroke-width="1">')
    for x in range(0, w + 1, step):
        g.append(f'<path d="M{x} 0V{h}"/>')
    for y in range(0, h + 1, step):
        g.append(f'<path d="M0 {y}H{w}"/>')
    g.append('</g>')
    # heavier every 4th line
    g.append(f'<g stroke="{INK}" stroke-opacity=".09" stroke-width="1">')
    for x in range(0, w + 1, step * 4):
        g.append(f'<path d="M{x} 0V{h}"/>')
    for y in range(0, h + 1, step * 4):
        g.append(f'<path d="M0 {y}H{w}"/>')
    g.append('</g>')
    return "".join(g)

def esc(t):
    return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def label(x, y, text, size=13, op=.55, anchor="start", weight=500, ls=2.2, fill=INK):
    text = esc(text)
    return (f'<text x="{x}" y="{y}" fill="{fill}" fill-opacity="{op}" font-family="Inter,Helvetica,Arial,sans-serif" '
            f'font-size="{size}" font-weight="{weight}" letter-spacing="{ls}" text-anchor="{anchor}">{text}</text>')

def dim_h(x1, x2, y, text, op=.42):
    """Horizontal dimension line with end ticks."""
    return (f'<g stroke="{INK}" stroke-opacity="{op}" stroke-width="1.2">'
            f'<path d="M{x1} {y}H{x2}"/><path d="M{x1} {y-7}v14"/><path d="M{x2} {y-7}v14"/></g>'
            + label((x1 + x2) / 2, y - 12, text, 12, .5, "middle"))

def dim_v(y1, y2, x, text, op=.42):
    return (f'<g stroke="{INK}" stroke-opacity="{op}" stroke-width="1.2">'
            f'<path d="M{x} {y1}V{y2}"/><path d="M{x-7} {y1}h14"/><path d="M{x-7} {y2}h14"/></g>'
            + f'<g transform="translate({x-10},{(y1+y2)/2}) rotate(-90)">' + label(0, 0, text, 12, .5, "middle") + '</g>')

def hatch(x, y, w, h, gap=9, op=.16, angle=45):
    lines = []
    n = int((w + h) / gap)
    for i in range(n + 1):
        o = i * gap
        lines.append(f'M{x+o} {y}L{x+o-h} {y+h}')
    return (f'<g clip-path="url(#c{x}{y})"><clipPath id="c{x}{y}"><rect x="{x}" y="{y}" width="{w}" height="{h}"/></clipPath>'
            f'<path d="{" ".join(lines)}" stroke="{INK}" stroke-opacity="{op}" stroke-width="1"/></g>')

def titleblock(w, h, code, name, sheet):
    x, y = w - 372, h - 108
    return (f'<g><rect x="{x}" y="{y}" width="340" height="76" fill="none" stroke="{INK}" stroke-opacity=".22"/>'
            f'<path d="M{x} {y+28}h340" stroke="{INK}" stroke-opacity=".22"/>'
            f'<path d="M{x+228} {y}v76" stroke="{INK}" stroke-opacity=".22"/>'
            + label(x + 14, y + 19, code, 12, .45)
            + label(x + 14, y + 54, name, 15, .85, weight=600, ls=0)
            + label(x + 242, y + 19, "SHEET", 11, .4)
            + label(x + 242, y + 54, sheet, 15, .7, weight=600, ls=0) + '</g>')

def frame(w, h):
    return (f'<rect x="24" y="24" width="{w-48}" height="{h-48}" fill="none" stroke="{INK}" stroke-opacity=".18"/>'
            f'<rect x="34" y="34" width="{w-68}" height="{h-68}" fill="none" stroke="{INK}" stroke-opacity=".08"/>')

def save(name, body):
    with open(os.path.join(OUT, name), "w") as f:
        f.write(body + "</svg>")
    print(name, os.path.getsize(os.path.join(OUT, name)) // 1024, "KB")

W21, H21 = 2400, 1029   # 21:9
W16, H16 = 2000, 1250   # 16:10

# ---------------------------------------------------------------- 1. hero: rising frame (animated)
def home_hero():
    w, h = W21, H21
    s = [head(w, h,
        '<style>'
        '@keyframes sweep{0%{transform:translateX(0)}50%{transform:translateX(240px)}100%{transform:translateX(0)}}'
        '@keyframes glow{0%,100%{opacity:.25}50%{opacity:.75}}'
        '@keyframes rise{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}'
        '.sweep{animation:sweep 9s ease-in-out infinite}'
        '.glow{animation:glow 4.5s ease-in-out infinite}'
        '.r1{animation:rise 1.2s ease-out both}.r2{animation:rise 1.2s .25s ease-out both}'
        '.r3{animation:rise 1.2s .5s ease-out both}.r4{animation:rise 1.2s .75s ease-out both}'
        '@media (prefers-reduced-motion: reduce){.sweep,.glow,.r1,.r2,.r3,.r4{animation:none}}'
        '</style>')]
    s.append(ground(w, h))
    s.append(frame(w, h))
    base = 830
    left, right = 360, 1700
    # ground line
    s.append(f'<path d="M120 {base}H{w-120}" stroke="{INK}" stroke-opacity=".5" stroke-width="2"/>')
    s.append(hatch(120, base, w - 240, 34, gap=14, op=.13))
    # columns
    cols = [left + i * 268 for i in range(6)]
    for i, cx in enumerate(cols):
        s.append(f'<g class="r{min(i%4+1,4)}"><rect x="{cx}" y="{base-470}" width="26" height="470" fill="{INK}" fill-opacity=".12" stroke="{INK}" stroke-opacity=".45"/></g>')
    # slabs
    for i, y in enumerate([base - 160, base - 310, base - 460]):
        s.append(f'<g class="r{i+2}"><rect x="{left-26}" y="{y}" width="{cols[-1]-left+78}" height="16" fill="{INK}" fill-opacity=".2" stroke="{INK}" stroke-opacity=".5"/></g>')
    # roof line + rising rule
    s.append(f'<path class="glow" d="M{left-26} {base-470}L{cols[-1]+52} {base-560}" stroke="{ACC}" stroke-opacity=".7" stroke-width="3"/>')
    s.append(f'<path class="glow" d="M{left+40} {base-40}V{base-190} h240 V{base-340} h240 V{base-500}" fill="none" stroke="{ACC}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
    # sweeping measure line
    s.append(f'<g class="sweep">{dim_h(left, left+268, base+92, "3 600")}</g>')
    s.append(dim_h(left, cols[-1] + 26, base + 168, "18 000 OVERALL"))
    s.append(dim_v(base - 470, base, left - 90, "12 400"))
    # annotations
    s.append(label(140, 120, "ELEVATION  SOUTH", 16, .5))
    s.append(label(140, 156, "SCALE 1:100", 13, .32))
    s.append(label(w - 140, 120, "GHS 623,228", 34, .9, "end", 600, 0))
    s.append(label(w - 140, 154, "QUOTED TOTAL · 19.5% MARGIN", 12, .42, "end"))
    s.append(titleblock(w, h, "EST-2026-0118", "East Legon Residence", "A-01"))
    save("home-hero.svg", "".join(s))

# ---------------------------------------------------------------- 2. floor plan
def home_who():
    w, h = W16, H16
    s = [head(w, h), ground(w, h), frame(w, h)]
    x0, y0, x1, y1 = 300, 260, 1700, 1000
    t = 18
    def wall(a, b, c, d):
        return f'<rect x="{a}" y="{b}" width="{c}" height="{d}" fill="{INK}" fill-opacity=".18" stroke="{INK}" stroke-opacity=".55"/>'
    s.append(wall(x0, y0, x1 - x0, t))
    s.append(wall(x0, y1 - t, x1 - x0, t))
    s.append(wall(x0, y0, t, y1 - y0))
    s.append(wall(x1 - t, y0, t, y1 - y0))
    # internal walls
    s.append(wall(880, y0, t, 300))
    s.append(wall(880, 620, t, y1 - 620 - t))
    s.append(wall(x0, 620, 580, t))
    s.append(wall(1260, 620, 440, t))
    # door swings
    for (cx, cy, r, a0) in [(880, 560, 90, 180), (1180, 620, 100, 270), (620, 620, 90, 0)]:
        s.append(f'<path d="M{cx} {cy} m{r} 0 a{r} {r} 0 0 1 {-r} {r}" fill="none" stroke="{INK}" stroke-opacity=".3" stroke-dasharray="6 6"/>')
    # room labels
    for (lx, ly, name, area) in [(430, 430, "LIVING", "28.4 m²"), (1180, 420, "BEDROOM 1", "16.2 m²"),
                                 (430, 830, "KITCHEN", "12.8 m²"), (1400, 850, "BEDROOM 2", "14.1 m²")]:
        s.append(label(lx, ly, name, 15, .6, weight=600))
        s.append(label(lx, ly + 26, area, 13, .38, ls=0))
    s.append(dim_h(x0, x1, y1 + 92, "14 000"))
    s.append(dim_v(y0, y1, x0 - 92, "7 400"))
    s.append(label(140, 120, "GROUND FLOOR PLAN", 16, .5))
    s.append(label(140, 156, "TAKEOFF SOURCE", 13, .32))
    s.append(titleblock(w, h, "PRJ-2026-0028", "Boundary wall & gatehouse", "A-02"))
    save("home-who-we-are.svg", "".join(s))

# ---------------------------------------------------------------- 3. wall section
def home_method():
    w, h = W16, H16
    s = [head(w, h), ground(w, h), frame(w, h)]
    x, top, bot = 760, 240, 1030
    s.append(f'<rect x="{x}" y="{top}" width="150" height="{bot-top}" fill="{INK}" fill-opacity=".1" stroke="{INK}" stroke-opacity=".5"/>')
    # block courses
    y = top
    i = 0
    while y < bot - 40:
        s.append(f'<path d="M{x} {y}h150" stroke="{INK}" stroke-opacity=".35"/>')
        off = 0 if i % 2 else 75
        s.append(f'<path d="M{x+off} {y}v40" stroke="{INK}" stroke-opacity=".25"/>')
        y += 40; i += 1
    # render both faces
    s.append(f'<rect x="{x-22}" y="{top}" width="22" height="{bot-top}" fill="{ACC2}" fill-opacity=".25" stroke="{INK}" stroke-opacity=".3"/>')
    s.append(f'<rect x="{x+150}" y="{top}" width="22" height="{bot-top}" fill="{ACC2}" fill-opacity=".25" stroke="{INK}" stroke-opacity=".3"/>')
    # footing
    s.append(f'<path d="M{x-90} {bot} h330 v90 h-330 z" fill="{INK}" fill-opacity=".14" stroke="{INK}" stroke-opacity=".5"/>')
    s.append(hatch(x - 90, bot + 90, 330, 120, gap=16, op=.14))
    s.append(f'<path d="M{x-260} {bot+90}H{x+400}" stroke="{INK}" stroke-opacity=".4"/>')
    # callouts
    calls = [(top + 70, "RENDER 12 mm", "0.28 bag/m²"),
             (top + 250, "6-INCH SANDCRETE BLOCK", "12.5 no/m²"),
             (top + 430, "MORTAR JOINT", "0.35 bag/m²"),
             (top + 610, "MASON LABOUR", "0.25 day/m²"),
             (bot + 60, "STRIP FOOTING C20", "0.18 m³/m")]
    for (cy, a, b) in calls:
        s.append(f'<path d="M{x+180} {cy}H{x+430}" stroke="{ACC}" stroke-opacity=".5" stroke-dasharray="5 5"/>')
        s.append(f'<circle cx="{x+180}" cy="{cy}" r="4" fill="{ACC}" fill-opacity=".8"/>')
        s.append(label(x + 444, cy - 4, a, 14, .72, weight=600))
        s.append(label(x + 444, cy + 22, b, 13, .4, ls=0))
    s.append(dim_v(top, bot, x - 120, "2 400"))
    s.append(label(140, 120, "WALL SECTION  TYPICAL", 16, .5))
    s.append(label(140, 156, "1 m² ASSEMBLY", 13, .32))
    s.append(titleblock(w, h, "ASM-004", "1 m² 6-inch block wall", "D-01"))
    save("home-method.svg", "".join(s))

# ---------------------------------------------------------------- 4. money / ledger
def home_money():
    w, h = W16, H16
    s = [head(w, h), ground(w, h), frame(w, h)]
    # bars
    vals = [.42, .55, .48, .68, .58, .76, .64, .84, .71, .9]
    bx, by, bw, bh = 200, 300, 900, 420
    for i, v in enumerate(vals):
        x = bx + i * 88
        s.append(f'<rect x="{x}" y="{by+bh-int(bh*v)}" width="46" height="{int(bh*v)}" fill="{ACC2}" fill-opacity=".55"/>')
        s.append(f'<rect x="{x+50}" y="{by+bh-int(bh*v*.62)}" width="20" height="{int(bh*v*.62)}" fill="{INK}" fill-opacity=".22"/>')
    s.append(f'<path d="M{bx} {by+bh}H{bx+len(vals)*88}" stroke="{INK}" stroke-opacity=".4"/>')
    s.append(label(bx, by - 30, "CASH IN / CASH OUT  10 MONTHS", 14, .5))
    # ledger
    lx, ly = 1220, 300
    rows = [("INV-2026-0032", "170,000", "51,000", "OVERDUE"),
            ("INV-2026-0034", "96,500", "96,500", "DUE 3 D"),
            ("INV-2026-0035", "240,000", "0", "PAID"),
            ("INV-2026-0036", "88,200", "88,200", "SENT"),
            ("INV-2026-0037", "132,000", "44,000", "PART")]
    s.append(f'<path d="M{lx} {ly-24}h560" stroke="{INK}" stroke-opacity=".35"/>')
    s.append(label(lx, ly - 40, "OUTSTANDING", 14, .5))
    for i, (a, b, c, d) in enumerate(rows):
        y = ly + 30 + i * 74
        s.append(label(lx, y, a, 16, .8, weight=600, ls=0))
        s.append(label(lx + 380, y, b, 16, .5, "end", ls=0))
        s.append(label(lx + 560, y, c, 16, .85, "end", ls=0))
        s.append(label(lx, y + 24, d, 11, .4))
        s.append(f'<path d="M{lx} {y+40}h560" stroke="{INK}" stroke-opacity=".12"/>')
    s.append(label(140, 120, "PROJECT FINANCIALS", 16, .5))
    s.append(label(w - 140, 120, "GHS 184,200", 30, .9, "end", 600, 0))
    s.append(label(w - 140, 152, "OUTSTANDING · 12 INVOICES", 11, .4, "end"))
    s.append(titleblock(w, h, "INV LEDGER", "Tema Office Fit-Out", "F-01"))
    save("home-money.svg", "".join(s))

# ---------------------------------------------------------------- 5. skyline
def home_footprint():
    w, h = W21, H21
    s = [head(w, h), ground(w, h), frame(w, h)]
    base = 840
    random.seed(7)
    x = 200
    while x < w - 200:
        bw = random.choice([120, 160, 200, 240])
        bh = random.choice([180, 260, 340, 420, 500])
        s.append(f'<rect x="{x}" y="{base-bh}" width="{bw}" height="{bh}" fill="{INK}" fill-opacity=".08" stroke="{INK}" stroke-opacity=".38"/>')
        # windows
        for wy in range(base - bh + 30, base - 30, 46):
            for wx in range(x + 22, x + bw - 30, 42):
                s.append(f'<rect x="{wx}" y="{wy}" width="18" height="22" fill="{INK}" fill-opacity=".12"/>')
        if random.random() < .35:
            s.append(f'<path d="M{x+bw/2} {base-bh}v-70" stroke="{ACC}" stroke-opacity=".5" stroke-width="2"/>')
        x += bw + random.choice([30, 46, 60])
    s.append(f'<path d="M120 {base}H{w-120}" stroke="{INK}" stroke-opacity=".55" stroke-width="2"/>')
    s.append(hatch(120, base, w - 240, 40, gap=16, op=.12))
    s.append(dim_h(200, w - 200, base + 140, "PORTFOLIO  24 ACTIVE PROJECTS"))
    s.append(label(140, 120, "FOOTPRINT", 16, .5))
    s.append(label(140, 156, "GREATER ACCRA · ASHANTI · WESTERN", 13, .32))
    s.append(titleblock(w, h, "PORTFOLIO", "Contract value tracked to retention", "S-01"))
    save("home-footprint.svg", "".join(s))

# ---------------------------------------------------------------- 6. product hero: plan + table
def product_hero():
    w, h = W21, H21
    s = [head(w, h,
        '<style>@keyframes fade{0%,100%{opacity:.25}50%{opacity:.8}}.f{animation:fade 6s ease-in-out infinite}'
        '@media (prefers-reduced-motion: reduce){.f{animation:none}}</style>'),
        ground(w, h), frame(w, h)]
    # left: takeoff plan
    s.append(f'<rect x="180" y="240" width="880" height="560" fill="none" stroke="{INK}" stroke-opacity=".45"/>')
    s.append(f'<path d="M620 240V800M180 540H1060" stroke="{INK}" stroke-opacity=".28"/>')
    s.append(hatch(180, 240, 440, 300, gap=20, op=.1))
    s.append(f'<path class="f" d="M180 240H1060V800H180Z" fill="none" stroke="{ACC}" stroke-opacity=".7" stroke-width="3" stroke-dasharray="14 10"/>')
    s.append(dim_h(180, 1060, 860, "180 m² MEASURED"))
    s.append(label(200, 200, "TAKEOFF", 14, .5))
    # right: estimate rows
    rx = 1300
    rows = [("Excavation", "48", "m³", "6,624"), ("Concrete C25", "22", "m³", "24,794"),
            ("Reinforcement 12 mm", "1.8", "t", "20,563"), ("Masonry labour", "14", "day", "3,542"),
            ("Hardcore filling", "26", "m³", "5,382")]
    s.append(label(rx, 200, "ESTIMATE  FOUNDATION", 14, .5))
    s.append(f'<path d="M{rx} 230h880" stroke="{INK}" stroke-opacity=".35"/>')
    for i, (a, q, u, amt) in enumerate(rows):
        y = 290 + i * 82
        s.append(label(rx, y, a, 18, .85, weight=500, ls=0))
        s.append(label(rx + 560, y, q, 18, .5, "end", ls=0))
        s.append(label(rx + 620, y, u, 14, .35, ls=0))
        s.append(label(rx + 880, y, amt, 18, .9, "end", ls=0))
        s.append(f'<path d="M{rx} {y+26}h880" stroke="{INK}" stroke-opacity=".12"/>')
    s.append(f'<path d="M{rx} 730h880" stroke="{INK}" stroke-opacity=".35"/>')
    s.append(label(rx, 780, "DIRECT COST", 14, .5))
    s.append(label(rx + 880, 786, "GHS 489,100", 30, .95, "end", 600, 0))
    s.append(titleblock(w, h, "EST-2026-0118", "Measured, priced, quoted", "P-01"))
    save("product-hero.svg", "".join(s))

# ---------------------------------------------------------------- 7. rebar / formwork
def product_estimating():
    w, h = W16, H16
    s = [head(w, h), ground(w, h), frame(w, h)]
    x0, y0, x1, y1 = 420, 300, 1580, 960
    s.append(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="{INK}" fill-opacity=".07" stroke="{INK}" stroke-opacity=".5"/>')
    for x in range(x0 + 60, x1, 88):
        s.append(f'<path d="M{x} {y0+30}V{y1-30}" stroke="{INK}" stroke-opacity=".3"/>')
    for y in range(y0 + 60, y1, 88):
        s.append(f'<path d="M{x0+30} {y}H{x1-30}" stroke="{INK}" stroke-opacity=".3"/>')
    for x in range(x0 + 60, x1, 88):
        for y in range(y0 + 60, y1, 88):
            s.append(f'<circle cx="{x}" cy="{y}" r="7" fill="{ACC}" fill-opacity=".55"/>')
    s.append(dim_h(x0, x1, y1 + 96, "12 mm @ 200 CRS BOTHWAYS"))
    s.append(dim_v(y0, y1, x0 - 96, "SLAB 175"))
    s.append(label(140, 120, "REINFORCEMENT LAYOUT", 16, .5))
    s.append(label(140, 156, "1.8 TONNE · PRICED BY ASSEMBLY", 13, .32))
    s.append(titleblock(w, h, "PRJ-2026-0003", "Spintex Warehouse Extension", "S-04"))
    save("product-estimating.svg", "".join(s))

# ---------------------------------------------------------------- 8. milestone timeline
def product_cash():
    w, h = W16, H16
    s = [head(w, h), ground(w, h), frame(w, h)]
    y = 640
    x0, x1 = 240, 1760
    s.append(f'<path d="M{x0} {y}H{x1}" stroke="{INK}" stroke-opacity=".45" stroke-width="2"/>')
    ms = [("MOBILISATION", "20%", True), ("FOUNDATION", "15%", True), ("SUPERSTRUCTURE", "20%", True),
          ("ROOFING", "15%", False), ("MEP", "10%", False), ("FINISHING", "15%", False), ("COMPLETION", "5%", False)]
    step = (x1 - x0) / (len(ms) - 1)
    for i, (name, pct, paid) in enumerate(ms):
        x = x0 + i * step
        s.append(f'<circle cx="{x}" cy="{y}" r="13" fill="{ACC if paid else BG}" fill-opacity="{1 if paid else 1}" stroke="{INK}" stroke-opacity=".55" stroke-width="2"/>')
        up = i % 2 == 0
        ty = y - 60 if up else y + 76
        s.append(f'<path d="M{x} {y + (-20 if up else 20)}v{-26 if up else 26}" stroke="{INK}" stroke-opacity=".3"/>')
        s.append(label(x, ty, name, 12, .55, "middle"))
        s.append(label(x, ty + (-26 if up else 26), pct, 22, .9, "middle", 600, 0))
    s.append(f'<path d="M{x0} {y}H{x0+2*step}" stroke="{ACC}" stroke-opacity=".8" stroke-width="4"/>')
    s.append(label(140, 120, "PAYMENT SCHEDULE", 16, .5))
    s.append(label(140, 156, "55% INVOICED · RETENTION 5%", 13, .32))
    s.append(label(w - 140, 120, "GHS 865,500", 30, .9, "end", 600, 0))
    s.append(label(w - 140, 152, "REVISED CONTRACT VALUE", 11, .4, "end"))
    s.append(titleblock(w, h, "CON-2026-0004", "Labone Duplex", "C-01"))
    save("product-cash.svg", "".join(s))

# ---------------------------------------------------------------- 9. roof truss
def pricing_hero():
    w, h = W16, H16
    s = [head(w, h), ground(w, h), frame(w, h)]
    x0, x1, base, apex = 300, 1700, 880, 380
    mid = (x0 + x1) / 2
    s.append(f'<path d="M{x0} {base}L{mid} {apex}L{x1} {base}Z" fill="{INK}" fill-opacity=".06" stroke="{INK}" stroke-opacity=".55" stroke-width="2"/>')
    s.append(f'<path d="M{x0} {base}H{x1}" stroke="{INK}" stroke-opacity=".5" stroke-width="2"/>')
    n = 6
    for i in range(1, n):
        t = i / n
        lx = x0 + (mid - x0) * t
        ly = base - (base - apex) * t
        rx = x1 - (x1 - mid) * t
        s.append(f'<path d="M{lx} {ly}L{lx} {base}" stroke="{INK}" stroke-opacity=".3"/>')
        s.append(f'<path d="M{rx} {ly}L{rx} {base}" stroke="{INK}" stroke-opacity=".3"/>')
        s.append(f'<path d="M{lx} {ly}L{x0 + (mid-x0)*(i+1)/n} {base}" stroke="{ACC}" stroke-opacity=".35"/>')
        s.append(f'<path d="M{rx} {ly}L{x1 - (x1-mid)*(i+1)/n} {base}" stroke="{ACC}" stroke-opacity=".35"/>')
    s.append(dim_h(x0, x1, base + 120, "14 000 SPAN"))
    s.append(dim_v(apex, base, x0 - 110, "3 200 RISE"))
    s.append(label(140, 120, "ROOF TRUSS  TYPE A", 16, .5))
    s.append(label(140, 156, "ALUZINC 0.45 mm · 5% WASTE", 13, .32))
    s.append(titleblock(w, h, "EST-2026-0090", "Dansoman Roof Replacement", "R-01"))
    save("pricing-hero.svg", "".join(s))

# ---------------------------------------------------------------- 10. site plan
def about_hero():
    w, h = W21, H21
    s = [head(w, h), ground(w, h), frame(w, h)]
    s.append(f'<path d="M300 780L560 300L1500 240L1980 620L1700 860Z" fill="{INK}" fill-opacity=".05" stroke="{INK}" stroke-opacity=".5" stroke-width="2"/>')
    for i in range(1, 6):
        o = i * 34
        s.append(f'<path d="M{330+o} {760-o//2}L{575+o} {330-o//3}L{1470-o} {275+o//3}L{1930-o} {615-o//4}L{1680-o} {830-o//2}Z" fill="none" stroke="{INK}" stroke-opacity=".13" stroke-dasharray="8 8"/>')
    s.append(f'<rect x="760" y="430" width="420" height="260" fill="{ACC2}" fill-opacity=".28" stroke="{ACC}" stroke-opacity=".7" stroke-width="2"/>')
    s.append(label(970, 570, "PROPOSED BUILDING", 14, .8, "middle"))
    # north arrow
    s.append(f'<g transform="translate(2080,220)"><path d="M0 -46L16 22L0 8L-16 22Z" fill="{INK}" fill-opacity=".7"/>{label(0, 52, "N", 16, .6, "middle", 600, 0)}</g>')
    s.append(dim_h(300, 1980, 960, "PLOT 42 · 0.31 ACRE"))
    s.append(label(140, 120, "SITE PLAN", 16, .5))
    s.append(label(140, 156, "AIRPORT CITY, GREATER ACCRA", 13, .32))
    s.append(titleblock(w, h, "SITE-042", "Where the method was tested", "L-01"))
    save("about-hero.svg", "".join(s))

# ---------------------------------------------------------------- 11. two BOQ sheets
def about_team():
    w, h = W16, H16
    s = [head(w, h), ground(w, h), frame(w, h)]
    def sheet(x, y, rot, rows, title):
        g = [f'<g transform="translate({x},{y}) rotate({rot})">',
             f'<rect width="820" height="880" fill="{BG}" stroke="{INK}" stroke-opacity=".4"/>',
             f'<path d="M0 90h820" stroke="{INK}" stroke-opacity=".3"/>',
             label(40, 58, title, 16, .8, weight=600, ls=0)]
        for i in range(rows):
            yy = 150 + i * 64
            g.append(f'<path d="M40 {yy+20}h740" stroke="{INK}" stroke-opacity=".12"/>')
            g.append(f'<rect x="40" y="{yy-8}" width="{260 - (i*17)%120}" height="10" fill="{INK}" fill-opacity=".22"/>')
            g.append(f'<rect x="560" y="{yy-8}" width="80" height="10" fill="{INK}" fill-opacity=".16"/>')
            g.append(f'<rect x="680" y="{yy-8}" width="100" height="10" fill="{ACC}" fill-opacity=".35"/>')
        g.append('</g>')
        return "".join(g)
    s.append(sheet(240, 220, -4, 10, "BILL OF QUANTITIES  SECTION 3"))
    s.append(sheet(900, 180, 3, 10, "PRICED ESTIMATE  REVIEWED"))
    s.append(label(140, 120, "PRICING REVIEW", 16, .5))
    s.append(label(140, 156, "EVERY FIGURE DEFENDED LINE BY LINE", 13, .32))
    save("about-team.svg", "".join(s))

# ---------------------------------------------------------------- 12. map / pin
def contact_hero():
    w, h = W16, H16
    s = [head(w, h,
        '<style>@keyframes ping{0%{r:40;opacity:.55}100%{r:300;opacity:0}}.p{animation:ping 4.5s ease-out infinite}'
        '.p2{animation:ping 4.5s 1.5s ease-out infinite}'
        '@media (prefers-reduced-motion: reduce){.p,.p2{animation:none;opacity:.2}}</style>'),
        ground(w, h, 40), frame(w, h)]
    random.seed(3)
    for i in range(14):
        x = random.randint(120, w - 260); y = random.randint(140, h - 200)
        bw = random.choice([90, 130, 180]); bh = random.choice([70, 110, 150])
        s.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" fill="{INK}" fill-opacity=".05" stroke="{INK}" stroke-opacity=".18"/>')
    for y in (380, 760):
        s.append(f'<path d="M60 {y}H{w-60}" stroke="{INK}" stroke-opacity=".22" stroke-width="10"/>')
    s.append(f'<path d="M980 60V{h-60}" stroke="{INK}" stroke-opacity=".22" stroke-width="10"/>')
    cx, cy = 980, 620
    s.append(f'<circle class="p" cx="{cx}" cy="{cy}" r="40" fill="none" stroke="{ACC}" stroke-width="2"/>')
    s.append(f'<circle class="p2" cx="{cx}" cy="{cy}" r="40" fill="none" stroke="{ACC}" stroke-width="2"/>')
    s.append(f'<path d="M{cx} {cy-70}a34 34 0 1 1 -0.1 0Z" fill="{ACC}" fill-opacity=".9"/>')
    s.append(f'<path d="M{cx-14} {cy-14}l14 42 14-42z" fill="{ACC}" fill-opacity=".9"/>')
    s.append(f'<circle cx="{cx}" cy="{cy-36}" r="12" fill="{BG}"/>')
    s.append(label(cx + 60, cy - 30, "ACCRA", 18, .85, weight=600, ls=1))
    s.append(label(cx + 60, cy, "GREATER ACCRA, GHANA", 12, .45))
    s.append(label(140, 120, "WHERE WE ARE", 16, .5))
    save("contact-hero.svg", "".join(s))

# ---------------------------------------------------------------- 13. rate book
def blog_hero():
    w, h = W16, H16
    s = [head(w, h), ground(w, h), frame(w, h)]
    x, y = 300, 240
    s.append(f'<rect x="{x}" y="{y}" width="1400" height="820" fill="{BG}" stroke="{INK}" stroke-opacity=".4"/>')
    s.append(f'<path d="M{x} {y+96}h1400" stroke="{INK}" stroke-opacity=".3"/>')
    s.append(label(x + 40, y + 62, "RATE BOOK  MATERIALS", 18, .8, weight=600, ls=1))
    rows = [("Ghacem cement 50kg", "bag", "98.00", "12 d"), ("6-inch sandcrete block", "no", "9.50", "31 d"),
            ("Sharp sand", "trip", "1,450.00", "8 d"), ("12 mm reinforcement", "kg", "12.40", "82 d"),
            ("60×60 porcelain tile", "m²", "132.00", "24 d"), ("Aluzinc sheet 0.45", "m²", "88.00", "67 d"),
            ("Emulsion paint 4 gal", "no", "520.00", "19 d")]
    for i, (a, u, p, age) in enumerate(rows):
        ry = y + 170 + i * 96
        stale = int(age.split()[0]) > 60
        s.append(label(x + 40, ry, a, 20, .85, weight=500, ls=0))
        s.append(label(x + 900, ry, u, 16, .4, "end", ls=0))
        s.append(label(x + 1180, ry, p, 20, .9, "end", ls=0))
        s.append(label(x + 1360, ry, age, 14, .8 if stale else .35, "end", ls=0,
                       fill="#F0736A" if stale else INK))
        s.append(f'<path d="M{x+40} {ry+30}h1320" stroke="{INK}" stroke-opacity=".1"/>')
    s.append(label(140, 120, "FIELD NOTES", 16, .5))
    s.append(label(140, 156, "A RATE WITHOUT A DATE IS A GUESS", 13, .32))
    save("blog-hero.svg", "".join(s))

for fn in (home_hero, home_who, home_method, home_money, home_footprint, product_hero,
           product_estimating, product_cash, pricing_hero, about_hero, about_team,
           contact_hero, blog_hero):
    fn()
