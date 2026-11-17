import pytest
from app.modules.targets.router import extract_meal_nutrients_sum, NUTRIENT_ALIASES, LIMIT_NUTRIENTS

def test_extract_meal_nutrients_from_top_level_meal_totals():
    meal = {
        "mealTotals": {
            "energyKcal": 650.0,
            "proteinG": 32.5,
            "carbohydrateG": 78.0,
            "fatG": 18.0,
            "sodiumMg": 450.0
        }
    }
    totals = extract_meal_nutrients_sum(meal)
    assert totals["energyKcal"] == 650.0
    assert totals["proteinG"] == 32.5
    assert totals["carbohydrateG"] == 78.0
    assert totals["fatG"] == 18.0
    assert totals["sodiumMg"] == 450.0

def test_extract_meal_nutrients_from_item_snapshots_with_aliases():
    meal = {
        "items": [
            {
                "foodNameSnapshot": "Oatmeal",
                "nutrientSnapshot": {
                    "calories": 250.0,
                    "protein": 10.0,
                    "carbs": 45.0,
                    "totalFat": 4.5,
                    "fiber": 6.0
                }
            },
            {
                "foodNameSnapshot": "Boiled Eggs",
                "nutrientSnapshot": {
                    "energyKcal": 150.0,
                    "proteinG": 13.0,
                    "carbohydrateG": 1.0,
                    "fatG": 10.5
                }
            }
        ]
    }
    totals = extract_meal_nutrients_sum(meal)
    assert totals["energyKcal"] == 400.0  # 250 + 150
    assert totals["proteinG"] == 23.0    # 10 + 13
    assert totals["carbohydrateG"] == 46.0  # 45 + 1
    assert totals["fatG"] == 15.0        # 4.5 + 10.5
    assert totals["fiberG"] == 6.0

def test_progress_status_categorization():
    # Test status rules for limits (e.g. sodiumMg) vs regular targets
    def compute_status(consumed, target, is_limit):
        pct = round((consumed / target) * 100.0, 1)
        if is_limit:
            if pct <= 80.0:
                return "on_track"
            elif pct <= 100.0:
                return "approaching"
            else:
                return "exceeded"
        else:
            if pct < 70.0:
                return "under"
            elif pct <= 110.0:
                return "on_track"
            else:
                return "exceeded"

    # Limit nutrient test (Sodium: 2000mg)
    assert compute_status(1200, 2000, True) == "on_track"       # 60%
    assert compute_status(1800, 2000, True) == "approaching"    # 90%
    assert compute_status(2200, 2000, True) == "exceeded"       # 110%

    # Regular nutrient test (Calories: 2110 kcal)
    assert compute_status(1000, 2110, False) == "under"         # 47.4%
    assert compute_status(1900, 2110, False) == "on_track"      # 90.0%
    assert compute_status(2500, 2110, False) == "exceeded"      # 118.5%

def test_extract_micronutrients_and_limits():
    meal = {
        "items": [
            {
                "foodNameSnapshot": "Greek Yogurt & Spinach",
                "nutrientSnapshot": {
                    "saturatedFat": 2.5,
                    "sugars": 5.0,
                    "calcium": 250.0,
                    "iron": 3.2,
                    "vitaminC": 15.0
                }
            }
        ]
    }
    totals = extract_meal_nutrients_sum(meal)
    assert totals["saturatedFatG"] == 2.5
    assert totals["sugarsG"] == 5.0
    assert totals["calciumMg"] == 250.0
    assert totals["ironMg"] == 3.2
    assert totals["vitaminCMg"] == 15.0

