# Media generators

Authored artwork for the public site. Both scripts write into `frontend/public/media`.

```bash
python3 scripts/media/svgs.py          # 13 technical-drawing stills
python3 scripts/media/video.py         # frame sequences for the two hero loops
ffmpeg -framerate 24 -i frames/home-hero/%04d.png \
  -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -c:v libx264 -crf 24 -preset veryfast \
  -pix_fmt yuv420p -movflags +faststart public/media/home-hero.mp4
ffmpeg -framerate 24 -i frames/home-hero/%04d.png \
  -c:v libvpx-vp9 -crf 46 -b:v 0 -row-mt 1 -cpu-used 6 public/media/home-hero.webm
```

Requires Python with Pillow, and ffmpeg for the loops. The palette, grid and annotation style are
defined at the top of `svgs.py`; keep both scripts in step so stills and motion match.
