# Human parsing (SegFormer, mattmdjaga/segformer_b2_clothes): soft "this is a person" map.
# Usage: python3 parse.py <image> <out.npy>
import sys, numpy as np, torch
from PIL import Image
from transformers import SegformerImageProcessor, AutoModelForSemanticSegmentation
proc = SegformerImageProcessor.from_pretrained('mattmdjaga/segformer_b2_clothes')
model = AutoModelForSemanticSegmentation.from_pretrained('mattmdjaga/segformer_b2_clothes')
im = Image.open(sys.argv[1]).convert('RGB')
with torch.no_grad():
    logits = model(**proc(images=im, return_tensors='pt')).logits
up = torch.nn.functional.interpolate(logits, size=im.size[::-1], mode='bilinear', align_corners=False)
prob = up.softmax(1)[0]
person = 1 - prob[0]                      # everything but background
np.save(sys.argv[2], person.numpy().astype(np.float16))
lab = up.argmax(1)[0].numpy()
print(model.config.id2label)
print({model.config.id2label[k]: int((lab == k).sum()) for k in np.unique(lab)})
Image.fromarray((person.numpy() * 255).astype(np.uint8)).save(sys.argv[2].replace('.npy', '.png'))
