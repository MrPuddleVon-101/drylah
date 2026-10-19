"""Turn the white-background logo into a transparent, dark-theme lockup:
white -> transparent, black ink -> bone, greens kept. usage: logo.py <in> <outdir>"""
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255
mx, mn = a.max(-1), a.min(-1)
sat = (mx - mn)
# alpha: distance from white, using the darkest channel so greens stay opaque
alpha = np.clip((1 - mn - 0.07) / 0.30, 0, 1)
alpha = np.where(sat > 0.12, np.clip((1 - mn - 0.05) / 0.22, 0, 1), alpha)
rgb = a.copy()
neutral = sat < 0.12
bone = np.array([0.93, 0.95, 0.91])
rgb[neutral] = bone
# unpremultiply greens against white
for c in range(3):
    rgb[..., c] = np.where(neutral, rgb[..., c], np.clip((a[..., c] - (1 - alpha)) / np.maximum(alpha, 1e-3), 0, 1))
# lift the brand greens a touch so they hold up on near-black
rgb = np.where(neutral[..., None], rgb, np.clip(rgb * 1.22, 0, 1))
img = Image.fromarray((np.dstack([rgb, alpha]) * 255).astype(np.uint8))
img = img.crop(img.getbbox())
img.save(f"{out}/drylah-lockup.png", optimize=True)
print(img.size)
