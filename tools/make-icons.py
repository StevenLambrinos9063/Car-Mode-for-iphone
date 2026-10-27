"""Generate home screen icons. Run: python3 tools/make-icons.py"""
from PIL import Image, ImageDraw

def icon(size, path):
    s = size * 4
    im = Image.new("RGB", (s, s), (10, 12, 16))
    d = ImageDraw.Draw(im)
    c, r = s // 2, int(s * 0.34)
    w = int(s * 0.07)
    d.ellipse([c - r, c - r, c + r, c + r], outline=(46, 204, 113), width=w)
    hub = int(s * 0.08)
    d.ellipse([c - hub, c - hub, c + hub, c + hub], fill=(46, 204, 113))
    d.rectangle([c - r, c - w // 2, c - hub, c + w // 2], fill=(46, 204, 113))
    d.rectangle([c + hub, c - w // 2, c + r, c + w // 2], fill=(46, 204, 113))
    d.rectangle([c - w // 2, c + hub, c + w // 2, c + r], fill=(46, 204, 113))
    im.resize((size, size), Image.LANCZOS).save(path)

icon(180, "icons/apple-touch-icon.png")
icon(192, "icons/icon-192.png")
icon(512, "icons/icon-512.png")
