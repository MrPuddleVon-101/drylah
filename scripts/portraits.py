"""Frame the cut-outs identically and even out exposure so four photos shot in
different light read as one set. Writes <name>.png (colour) and <name>-tone.png
(graded mono). usage: python portraits.py <cutdir> <outdir>"""
import sys, numpy as np
from PIL import Image, ImageFilter

cut, out = sys.argv[1], sys.argv[2]
FACES = {  # Vision face boxes (normalised, origin bottom-left)
  "6": (0.1289, 0.2148, 0.7049, 0.5320),
  "7": (0.1841, 0.1385, 0.6682, 0.5645),
  "8": (0.2422, 0.1657, 0.5329, 0.5454),
  "9": (0.2599, 0.2346, 0.4661, 0.2784),
}
SCALE_FIX = {"9": 0.74}  # Vision boxed Vedant's face tight; bring him in line with the others
# Vedant's photo was shot under hard top light: pull exposure down and roll off
# the highlights so the hair glare matches the other three.
FACE_TARGET = {"9": 0.42}
SHOULDER = {"9": (0.32, 0.22)}  # knee, slope above the knee
NAMES = {"6": "chng-en", "7": "christian-huray", "8": "shaurya-wadhawan", "9": "vedant-rastogi"}
W, H = 900, 1125
FACE_H, CX, CY = 0.34, 0.5, 0.42
LUMA = np.array([0.2126, 0.7152, 0.0722])
SHADOW = np.array([0.020, 0.055, 0.035])
LIGHT = np.array([0.95, 0.93, 0.87])

for k, (fx, fy, fw, fh) in FACES.items():
    im = Image.open(f"{cut}/{k}.png").convert("RGBA")
    iw, ih = im.size
    s = (FACE_H * H) / (fh * ih) * SCALE_FIX.get(k, 1.0)
    im = im.resize((round(iw * s), round(ih * s)), Image.LANCZOS)
    cx = (fx + fw / 2) * iw * s
    cy = (1 - (fy + fh / 2)) * ih * s
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.paste(im, (round(W * CX - cx), round(H * CY - cy)), im)

    a = np.asarray(canvas).astype(np.float32) / 255
    rgb, alpha = a[..., :3], a[..., 3].copy()

    # exposure: gamma so the centre of the face lands on the same luminance
    fh_px = FACE_H * H
    y0, y1 = int(H * CY - fh_px * 0.25), int(H * CY + fh_px * 0.25)
    x0, x1 = int(W * CX - fh_px * 0.25), int(W * CX + fh_px * 0.25)
    face_l = float(np.median(rgb[y0:y1, x0:x1] @ LUMA))
    g = np.log(FACE_TARGET.get(k, 0.48)) / np.log(max(face_l, 1e-3))
    rgb = np.clip(rgb, 1e-4, 1) ** g
    # neutralise casts using the face only, then calm saturation
    means = rgb[y0:y1, x0:x1].reshape(-1, 3).mean(axis=0)
    target = np.array([1.0, 0.86, 0.76]) * means.mean() / np.array([1.0, 0.86, 0.76]).mean()
    rgb = np.clip(rgb * (target / means), 0, 1)
    grey = (rgb @ LUMA)[..., None]
    rgb = np.clip(grey + (rgb - grey) * 0.82, 0, 1)

    # identical bottom fade for everyone: hides mismatched shoulders and crops
    chin = H * CY + fh_px * 0.5
    yy = np.arange(H)[:, None]
    fade = np.clip(1 - (yy - (chin - fh_px * 0.04)) / (fh_px * 0.24), 0, 1)
    fade = fade * fade * (3 - 2 * fade)
    alpha = alpha * fade

    Image.fromarray((np.dstack([rgb, alpha]) * 255).astype(np.uint8)).save(f"{out}/{NAMES[k]}.png", optimize=True)

    # graded mono: soft S-curve, then split-tone from deep green to warm bone
    l = rgb @ LUMA
    sel = (alpha > 0.5) & (yy < chin)
    lo, hi = np.percentile(l[sel], 3), np.percentile(l[sel], 97)
    l = np.clip((l - lo) / (hi - lo) * 0.88 + 0.04, 0, 1)
    if k in SHOULDER:
        # darken and compress only the hair, above the forehead
        knee, slope = SHOULDER[k]
        brow = H * CY - fh_px * 0.32
        hm = np.clip((brow - yy) / (fh_px * 0.18), 0, 1)
        hm = hm * hm * (3 - 2 * hm)
        hair = (np.minimum(l, knee) + np.maximum(l - knee, 0) * slope) * 0.72
        l = l * (1 - hm) + hair * hm
    tone = SHADOW + (LIGHT - SHADOW) * l[..., None]
    Image.fromarray((np.dstack([tone, alpha]) * 255).astype(np.uint8)).save(f"{out}/{NAMES[k]}-tone.png", optimize=True)
    print(NAMES[k], round(s, 2), round(float(face_l), 3), round(float(g), 2))
