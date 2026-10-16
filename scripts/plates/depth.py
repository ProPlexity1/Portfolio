# Estimate a relative depth map for a reference photo (Depth Anything V2).
# Usage: python3 depth.py <image> <out.npy> [long_side]
import sys, numpy as np, torch
from PIL import Image
from transformers import pipeline
Image.MAX_IMAGE_PIXELS = None
src, out = sys.argv[1], sys.argv[2]
long_side = int(sys.argv[3]) if len(sys.argv) > 3 else 1400
im = Image.open(src).convert('RGB')
k = long_side / max(im.size)
im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
pipe = pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Base-hf', device='cpu')
pipe.image_processor.size = {'height': 518 * 2, 'width': 518 * 2}  # finer detail than the default 518
torch.set_num_threads(4)
d = pipe(im)['predicted_depth'].squeeze().numpy()
d = np.array(Image.fromarray(d).resize(im.size, Image.BICUBIC))
np.save(out, d.astype(np.float32))
v = (d - d.min()) / (d.max() - d.min())
Image.fromarray((v * 255).astype(np.uint8)).save(out.replace('.npy', '.png'))
print(im.size, d.min(), d.max())
