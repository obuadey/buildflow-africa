# Public-site media

Every slot on the marketing site ships with authored artwork, so nothing is ever an empty box.
Two of them are motion loops; the rest are technical drawings in the brand's drafting language.

## What is here

| File | Where it appears | Crop |
| --- | --- | --- |
| `home-hero.svg` + `home-hero.mp4` / `.webm` | Homepage hero  the frame draws itself while the estimate totals | 21:9 |
| `home-who-we-are.svg` | Homepage, "What we do"  ground floor plan with dimensions | 16:10 |
| `home-method.svg` | Homepage, Method  wall section with 1 m² assembly callouts | 16:10 |
| `home-money.svg` | Homepage, Money  cash-flow bars and an outstanding ledger | 16:10 |
| `home-footprint.svg` | Homepage, Discipline / footprint  skyline elevation | 21:9 |
| `product-hero.svg` + `product-hero.mp4` / `.webm` | Product hero  takeoff measured, quantities priced | 21:9 |
| `product-estimating.svg` | Product, estimating  reinforcement layout | 16:10 |
| `product-cash.svg` | Product, contracts and cash  milestone schedule | 16:10 |
| `pricing-hero.svg` | Pricing  roof truss geometry | 16:10 |
| `about-hero.svg` | About hero  site plan | 21:9 |
| `about-team.svg` | About  bill of quantities under review | 16:10 |
| `contact-hero.svg` | Connect  location plan with a pinged marker | 16:10 |
| `blog-hero.svg` | Field notes  rate book with ageing prices | 16:10 |

`*-poster.jpg` files are the still frames used before a video starts and whenever a visitor has
`prefers-reduced-motion` set.

## Replacing artwork with photography

1. Drop the photograph in this folder, e.g. `home-hero.jpg`.
2. In `frontend/lib/media.ts`, point that slot's `src` at the new file.

Captions, credits and alt text all live in `lib/media.ts`  never in the page. If a file is ever
missing, the frame renders a labelled placeholder rather than breaking the layout.

Guidance
- JPG or WebP, sRGB, long edge 2400 px, under 400 KB after compression.
- Photograph real work. Avoid stock hard hats, handshakes and drone clichés.
- Get written permission before publishing images of workers or clients.

## Regenerating the artwork

The stills and both loops are produced by scripts kept with the design assets
(`svgs.py` renders the SVGs; `video.py` renders frames that ffmpeg encodes to MP4 and WebM at
1440×618, 24 fps, 9 s). Videos are muted, looping, inline, and pause when scrolled out of view.
