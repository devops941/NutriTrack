import pytest
import sys

sys.path.insert(0, 'backend')

from app.modules.meal_plans.schemas import (
    PlannedFoodItem,
    PlannedMeal,
    LogPlannedMealToDiaryRequest,
    NutrientVarianceItem
)
from app.modules.meal_plans.router import (
    calculate_plan_totals,
    TRACKED_PLAN_NUTRIENTS
)

def test_calculate_plan_totals():
    meal1 = PlannedMeal(
        mealType="lunch",
        name="Lunch Salad",
        items=[
            PlannedFoodItem(
                name="Chicken Breast",
                portionGrams=150.0,
                nutrients={"energyKcal": 240.0, "proteinG": 46.0, "fatG": 5.0, "carbohydrateG": 0.0}
            ),
            PlannedFoodItem(
                name="Brown Rice",
                portionGrams=100.0,
                nutrients={"energyKcal": 110.0, "proteinG": 2.5, "fatG": 0.9, "carbohydrateG": 23.0}
            )
        ]
    )

    totals = calculate_plan_totals([meal1])
    assert totals["energyKcal"] == 350.0
    assert totals["proteinG"] == 48.5
    assert totals["carbohydrateG"] == 23.0
    assert totals["fatG"] == 5.9

def test_log_planned_meal_to_diary_request_schema():
    req = LogPlannedMealToDiaryRequest(
        date="2026-11-17",
        mealType="lunch",
        name="Protein Lunch",
        items=[
            PlannedFoodItem(
                name="Grilled Paneer",
                portionGrams=100.0,
                nutrients={"energyKcal": 265.0, "proteinG": 18.0, "carbohydrateG": 4.0, "fatG": 20.0}
            )
        ],
        totalNutrients={"energyKcal": 265.0, "proteinG": 18.0}
    )
    assert req.date == "2026-11-17"
    assert req.mealType == "lunch"
    assert len(req.items) == 1
    assert req.items[0].name == "Grilled Paneer"
    assert req.totalNutrients["energyKcal"] == 265.0

def test_nutrient_variance_status_on_target():
    plan_val = 500.0
    act_val = 520.0  # +4% delta, within 10% tolerance
    variance = round(act_val - plan_val, 2)
    var_pct = round((variance / plan_val) * 100.0, 1)

    if abs(var_pct) <= 10.0:
        status_str = "on_target"
    elif variance > 0:
        status_str = "over_plan"
    else:
        status_str = "under_plan"

    item = NutrientVarianceItem(
        nutrient="energyKcal",
        planned=plan_val,
        actual=act_val,
        variance=variance,
        variancePercentage=var_pct,
        status=status_str
    )
    assert item.status == "on_target"
    assert item.variance == 20.0
    assert item.variancePercentage == 4.0
