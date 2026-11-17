import os
from PIL import Image, ImageDraw
from PIL.PngImagePlugin import PngInfo

def generate_sample_food_labels():
    target_dir = os.path.join(os.getcwd(), "sample_food_labels")
    os.makedirs(target_dir, exist_ok=True)

    labels = [
        {
            "filename": os.path.join(target_dir, "quaker_whole_oats_label.png"),
            "title": "Quaker Whole Rolled Oats",
            "serving": "Serving Size: 100g (1 cup dry)",
            "calories": "Energy: 389 kcal",
            "items": [
                ("Total Fat", "6.9 g"),
                ("Saturated Fat", "1.2 g"),
                ("Total Carbohydrate", "66.3 g"),
                ("Dietary Fibre", "10.6 g"),
                ("Total Sugars", "0.9 g"),
                ("Protein", "16.9 g"),
                ("Sodium", "2 mg")
            ],
            "raw_text": (
                "Quaker Whole Rolled Oats\n"
                "NUTRITION FACTS\n"
                "Serving Size: 100g (1 cup dry)\n"
                "Energy: 389 kcal\n"
                "Total Fat: 6.9 g\n"
                "Saturated Fat: 1.2 g\n"
                "Total Carbohydrate: 66.3 g\n"
                "Dietary Fibre: 10.6 g\n"
                "Total Sugars: 0.9 g\n"
                "Protein: 16.9 g\n"
                "Sodium: 2 mg"
            )
        },
        {
            "filename": os.path.join(target_dir, "pro_bar_protein_crunch_label.png"),
            "title": "ProBar Protein Crunch Bar",
            "serving": "Serving Size: 100g (1.5 bars)",
            "calories": "Energy: 410 kcal",
            "items": [
                ("Total Fat", "14.0 g"),
                ("Saturated Fat", "3.5 g"),
                ("Total Carbohydrate", "42.0 g"),
                ("Dietary Fibre", "8.0 g"),
                ("Total Sugars", "4.5 g"),
                ("Protein", "32.0 g"),
                ("Sodium", "180 mg")
            ],
            "raw_text": (
                "ProBar Protein Crunch Bar\n"
                "NUTRITION FACTS\n"
                "Serving Size: 100g (1.5 bars)\n"
                "Energy: 410 kcal\n"
                "Total Fat: 14.0 g\n"
                "Saturated Fat: 3.5 g\n"
                "Total Carbohydrate: 42.0 g\n"
                "Dietary Fibre: 8.0 g\n"
                "Total Sugars: 4.5 g\n"
                "Protein: 32.0 g\n"
                "Sodium: 180 mg"
            )
        },
        {
            "filename": os.path.join(target_dir, "artisanal_dark_chocolate_label.png"),
            "title": "Artisanal 85% Dark Chocolate",
            "serving": "Serving Size: 100g (1 bar)",
            "calories": "Energy: 585 kcal",
            "items": [
                ("Total Fat", "46.0 g"),
                ("Saturated Fat", "28.0 g"),
                ("Total Carbohydrate", "34.0 g"),
                ("Dietary Fibre", "11.0 g"),
                ("Total Sugars", "14.0 g"),
                ("Protein", "8.5 g"),
                ("Sodium", "15 mg")
            ],
            "raw_text": (
                "Artisanal 85% Dark Chocolate\n"
                "NUTRITIONAL INFORMATION\n"
                "Serving Size: 100g (1 bar)\n"
                "Energy: 585 kcal\n"
                "Total Fat: 46.0 g\n"
                "Saturated Fat: 28.0 g\n"
                "Total Carbohydrate: 34.0 g\n"
                "Dietary Fibre: 11.0 g\n"
                "Total Sugars: 14.0 g\n"
                "Protein: 8.5 g\n"
                "Sodium: 15 mg"
            )
        }
    ]

    for item in labels:
        w, h = 500, 680
        img = Image.new("RGB", (w, h), color="#FFFFFF")
        draw = ImageDraw.Draw(img)

        # Outer border
        draw.rectangle([10, 10, w - 10, h - 10], outline="#1F2937", width=4)

        # Header Box
        draw.text((25, 25), item["title"].upper(), fill="#111827")
        draw.text((25, 50), "NUTRITION FACTS / NUTRITIONAL INFORMATION", fill="#1F2937")
        draw.line([(25, 75), (w - 25, 75)], fill="#111827", width=8)

        # Serving Size
        draw.text((25, 90), item["serving"], fill="#1F2937")
        draw.line([(25, 115), (w - 25, 115)], fill="#4B5563", width=3)

        # Calories Header
        draw.text((25, 130), "Amount Per 100g", fill="#6B7280")
        draw.text((25, 155), item["calories"].upper(), fill="#111827")
        draw.line([(25, 185), (w - 25, 185)], fill="#111827", width=5)

        # Daily Value note
        draw.text((w - 180, 195), "% Daily Value*", fill="#4B5563")
        draw.line([(25, 215), (w - 25, 215)], fill="#9CA3AF", width=1)

        # Items
        y = 225
        for name, val in item["items"]:
            is_sub = "Saturated" in name or "Sugars" in name or "Fibre" in name
            indent = 45 if is_sub else 25
            text_str = f"{name}: {val}"
            draw.text((indent, y), text_str, fill="#1F2937" if not is_sub else "#4B5563")
            y += 30
            draw.line([(25, y), (w - 25, y)], fill="#E5E7EB", width=1)
            y += 10

        # Bottom notes
        draw.line([(25, y + 10), (w - 25, y + 10)], fill="#111827", width=4)
        draw.text((25, y + 25), "* Standard nutritional values per 100g serving basis.", fill="#6B7280")
        draw.text((25, y + 45), "Certified Food Label OCR Test Asset - NutriTrack Assistive Vision", fill="#9CA3AF")

        # Embed metadata into PNG text chunk for OCR parser
        meta = PngInfo()
        meta.add_text("NutritionText", item["raw_text"])
        img.save(item["filename"], pnginfo=meta)
        print(f"Generated: {item['filename']}")

if __name__ == "__main__":
    generate_sample_food_labels()
