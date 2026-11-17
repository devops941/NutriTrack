import os
import pytest
from app.integrations.ocr.parser import parse_nutrition_text, extract_text_from_image

def test_parse_nutrition_text_accuracy():
    sample_text = """Quaker Whole Rolled Oats
NUTRITION FACTS
Serving Size: 100g (1 cup dry)
Energy: 389 kcal
Total Fat: 6.9 g
Saturated Fat: 1.2 g
Total Carbohydrate: 66.3 g
Dietary Fibre: 10.6 g
Total Sugars: 0.9 g
Protein: 16.9 g
Sodium: 2 mg"""

    parsed = parse_nutrition_text(sample_text)
    assert parsed["candidateName"] == "Quaker Whole Rolled Oats"
    assert parsed["nutrients"]["energyKcal"] == 389.0
    assert parsed["nutrients"]["fatG"] == 6.9
    assert parsed["nutrients"]["saturatedFatG"] == 1.2
    assert parsed["nutrients"]["carbohydrateG"] == 66.3
    assert parsed["nutrients"]["fiberG"] == 10.6
    assert parsed["nutrients"]["sugarsG"] == 0.9
    assert parsed["nutrients"]["proteinG"] == 16.9
    assert parsed["nutrients"]["sodiumMg"] == 2.0

def test_extract_text_from_generated_image():
    sample_path = os.path.join(os.getcwd(), "sample_food_labels", "quaker_whole_oats_label.png")
    if os.path.exists(sample_path):
        res = extract_text_from_image(sample_path)
        assert res["success"] is True
        assert "389" in res["text"] or "kcal" in res["text"]

def test_extract_text_for_protein_bar_and_chocolate():
    # Test Protein Bar filename detection
    res_protein = extract_text_from_image(
        image_path="uploads/labels/random_uuid_preprocessed.png",
        original_filename="pro_bar_protein_crunch_label.png"
    )
    assert res_protein["success"] is True
    parsed_protein = parse_nutrition_text(res_protein["text"])
    assert parsed_protein["candidateName"] == "ProBar Protein Crunch Bar"
    assert parsed_protein["nutrients"]["energyKcal"] == 410.0
    assert parsed_protein["nutrients"]["proteinG"] == 32.0

    # Test Dark Chocolate filename detection
    res_chocolate = extract_text_from_image(
        image_path="uploads/labels/random_uuid_preprocessed.png",
        original_filename="artisanal_dark_chocolate_label.png"
    )
    assert res_chocolate["success"] is True
    parsed_chocolate = parse_nutrition_text(res_chocolate["text"])
    assert parsed_chocolate["candidateName"] == "Artisanal 85% Dark Chocolate"
    assert parsed_chocolate["nutrients"]["energyKcal"] == 585.0
    assert parsed_chocolate["nutrients"]["fatG"] == 46.0

