from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

out = Path(__file__).resolve().parents[1] / "web/public/social-card.png"
image = Image.new("RGB", (1200, 630), "#f7f7f4")
draw = ImageDraw.Draw(image)
draw.rectangle((0, 0, 24, 630), fill="#174b3b")
draw.rounded_rectangle((72, 72, 1128, 558), radius=28, fill="#ffffff", outline="#dfe3df", width=3)
try:
    title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 68)
    body_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 34)
    small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 25)
except OSError:
    title_font = body_font = small_font = ImageFont.load_default()
draw.text((130, 140), "FOOD SAFETY WATCH", font=small_font, fill="#174b3b")
draw.text((130, 205), "Bengaluru inspection reports", font=title_font, fill="#17201d")
draw.text((130, 315), "Dated, source-linked evidence.\nNot current ratings or a complete list.", font=body_font, fill="#626d68", spacing=18)
draw.ellipse((940, 170, 1050, 280), outline="#174b3b", width=12)
draw.polygon([(995, 355), (944, 258), (1046, 258)], fill="#174b3b")
draw.ellipse((972, 202, 1018, 248), fill="#174b3b")
image.save(out, optimize=True)
print(out)
