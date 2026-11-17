import pytest
from app.engines.comparison_engine import compare_food_products, normalize_food_nutrients, calculate_completeness

def test_normalize_food_nutrients_per_100g():
    food = {
        "name": "Oatmeal",
        "nutrients": {
            "energyKcal": 389.0,
            "proteinG": 16.9,
            "carbohydrateG": 66.3,
            "fatG": 6.9,
            "sodiumMg": 2.0
        }
    }
    norm = normalize_food_nutrients(food, basis="per_100g")
    assert norm["energyKcal"] == 389.0
    assert norm["proteinG"] == 16.9

def test_normalize_food_nutrients_per_serving():
    food = {
        "name": "Peanut Butter",
        "servingSize": 32.0,  # 32g serving
        "nutrients": {
            "energyKcal": 600.0,
            "proteinG": 25.0,
            "fatG": 50.0
        }
    }
    norm = normalize_food_nutrients(food, basis="serving")
    # 600 * 32 / 100 = 192.0 kcal
    assert norm["energyKcal"] == 192.0
    # 25 * 32 / 100 = 8.0 g
    assert norm["proteinG"] == 8.0
    # 50 * 32 / 100 = 16.0 g
    assert norm["fatG"] == 16.0

def test_compare_food_products_matrix_and_deltas():
    food1 = {
        "_id": "food_1",
        "name": "Rolled Oats",
        "nutrients": {
            "energyKcal": 389.0,
            "proteinG": 16.9,
            "fatG": 6.9,
            "sodiumMg": 2.0
        }
    }
    food2 = {
        "_id": "food_2",
        "name": "Corn Flakes",
        "nutrients": {
            "energyKcal": 357.0,
            "proteinG": 8.0,
            "fatG": 0.4,
            "sodiumMg": 729.0
        }
    }

    result = compare_food_products([food1, food2], basis="per_100g")

    assert len(result["products"]) == 2
    assert result["products"][0]["name"] == "Rolled Oats"
    assert result["products"][1]["name"] == "Corn Flakes"

    # Deltas relative to baseline (food1)
    # Energy: 357 - 389 = -32.0
    assert result["deltasVsFirst"]["energyKcal"][0] == -32.0
    # Protein: 8.0 - 16.9 = -8.9
    assert result["deltasVsFirst"]["proteinG"][0] == -8.9
    # Sodium: 729 - 2 = +727.0
    assert result["deltasVsFirst"]["sodiumMg"][0] == 727.0

def test_missing_data_retained_as_none():
    food1 = {
        "_id": "food_1",
        "name": "Whole Milk",
        "nutrients": {
            "energyKcal": 62.0,
            "calciumMg": 120.0,
            "vitaminCMg": None  # Missing
        }
    }
    food2 = {
        "_id": "food_2",
        "name": "Orange Juice",
        "nutrients": {
            "energyKcal": 45.0,
            "calciumMg": None,  # Missing
            "vitaminCMg": 50.0
        }
    }

    result = compare_food_products([food1, food2], basis="per_100g")
    # For calciumMg, product 2 is missing -> delta must be None (never assumed 0)
    assert result["deltasVsFirst"]["calciumMg"][0] is None
    # For vitaminCMg, product 1 is missing -> delta must be None
    assert result["deltasVsFirst"]["vitaminCMg"][0] is None
