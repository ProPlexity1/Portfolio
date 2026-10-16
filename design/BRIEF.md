# Descent: rebuild brief (2026-10-15)

What the owner (Ukasha) asked for after the generated-3D version, in their words, summarised.

## Verdict on the current build
- The procedural 3D world got worse: the camp and tents look bad, and the detail is gone.
- The lake is far too big and he is far too small. The original photo is the size reference.
- The ground blob under his feet ("the ground bit") looks bad. Remove it.
- The text and layout need a rethink too.

## Direction
- Work smarter: make **high-quality images** (rendered or composited), then compress them hard (AVIF/WebP, sized per breakpoint). The quality must be high on every device.
- **Preload every image when the site loads**, so scrolling only moves and blends what is already there. Scrolling must be buttery smooth.
- Re-imagine the peak, with much more detail at the top.
- The opening, in order:
  1. Start on the boot print in the snow at the summit.
  2. Look up from the footprint to show the view from the summit.
  3. Zoom out properly from the summit.
  4. Climb down, showing detail on the way, facing the summit. The camera never turns around.
- The end frame should be close to the original photo: the turquoise lake with dead trees standing in it, the snow banks, the forest, the snowy peak in cloud, and him on the rocks at a realistic size.
- Mouse look-around stays very gentle.
- Re-imagine everything, text included. Detailed, smooth, "legendary". Take the time it needs; this is a big project.

## Sources
- `reference/original-portrait.webp`: the original photo (1500x2000), the main size and look reference for the ending.
- `reference/original-panorama.webp`: a wide, AI-extended version of the same scene. The scenery may be used (confirmed 2026-10-16), but **never his figure or face from it**: they are cartoonish. He always comes from the real portrait.
- `plates/climber-portrait.png`: a clean full-resolution matte of him, cut from the real portrait (`scripts/plates/climber.py`).
- The scene plate is the panorama with its AI figure swapped for the real foreground from the portrait (him and his rock), at the same scale and spot (`scripts/plates/swap_figure.py`). The owner rejected a stitched wide merge and a framed portrait with blurred sides.
- `reference/*-upscaled-*.webp`: 4x upscales (Real-ESRGAN) for cutting high-res plates.
- `reference/climber-cutout.png`: the climber matte from the portrait.

## Constraints already in place
- Stack: React + Vite + Tailwind v4, Lenis scroll, WebGL stage in `src/features/descent/`.
- Contact form and admin portal: `api/`, `src/features/admin/`. Keep these working.
- Palette: ink #071318, snow #eaf2f2, glacier #6fd1c9.
- Every push to `main` deploys on Vercel, and the owner tests live.
