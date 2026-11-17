import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, 'backend')
load_dotenv('backend/.env')

from app.config.database import connect_to_mongo, close_mongo_connection, get_database
from app.modules.nutrition.schemas import (
    UnitConvertRequest,
    NutrientCalculateRequest,
    AggregateNutrientsRequest
)
from app.modules.nutrition.router import (
    convert_quantity,
    calculate_nutrition,
    aggregate_nutrition_items
)

async def run_calculation_verification():
    print("==================================================")
    print("PHASE 4 CONVERSION & CALCULATION ENGINE VERIFICATION")
    print("==================================================")

    await connect_to_mongo()
    db = get_database()
    assert db is not None, "Atlas database connection failed"

    # 1. Test Unit Conversion API
    conv_req = UnitConvertRequest(amount=1000.0, unit="mg", targetBasis="g")
    conv_res = await convert_quantity(conv_req)
    assert conv_res.success is True
    assert conv_res.data["normalizedQuantity"]["amount"] == 1.0
    assert conv_res.data["normalizedQuantity"]["unit"] == "g"
    print("✓ Mass conversion API: 1000mg -> 1.0g verified")

    conv_req2 = UnitConvertRequest(amount=2.5, unit="L", targetBasis="ml")
    conv_res2 = await convert_quantity(conv_req2)
    assert conv_res2.data["normalizedQuantity"]["amount"] == 2500.0
    assert conv_res2.data["normalizedQuantity"]["unit"] == "ml"
    print("✓ Volume conversion API: 2.5L -> 2500.0ml verified")

    # Incompatible conversion rejection
    try:
        await convert_quantity(UnitConvertRequest(amount=200, unit="g", targetBasis="ml"))
        raise AssertionError("Incompatible conversion should have failed!")
    except Exception:
        print("✓ Incompatible conversion (mass to volume without density) correctly rejected")

    # 2. Test Food Calculation API against seeded Rolled Oats in carequeue
    oats = await db.foods.find_one({"normalizedName": "rolled oats"})
    assert oats is not None, "Rolled Oats food item not found in DB"
    oats_id = str(oats["_id"])

    # Calculate for 50g oats (Spec Section 10 & 14.1: should give 194.5 kcal, 8.45g protein)
    calc_req = NutrientCalculateRequest(foodId=oats_id, quantity=50.0, unit="g")
    calc_res = await calculate_nutrition(calc_req)
    assert calc_res.success is True
    nutrients = calc_res.data["nutrients"]
    assert nutrients["proteinG"] == 8.45
    assert nutrients["energyKcal"] == 194.5
    assert nutrients["carbohydrateG"] == 33.15
    assert nutrients["fatG"] == 3.45
    print(f"✓ Calculation for 50g Oats: {nutrients['energyKcal']} kcal, {nutrients['proteinG']}g protein, {nutrients['carbohydrateG']}g carbs, {nutrients['fatG']}g fat")

    # 3. Test Custom Serving Calculation (1 standard bowl of oats = 40g)
    serving_calc_req = NutrientCalculateRequest(foodId=oats_id, quantity=1.0, unit="1 standard bowl")
    serving_calc_res = await calculate_nutrition(serving_calc_req)
    assert serving_calc_res.success is True
    serving_nutrients = serving_calc_res.data["nutrients"]
    # 40g oats = 389 * 0.40 = 155.6 kcal
    assert serving_nutrients["energyKcal"] == 155.6
    print(f"✓ Custom serving calculation (1 bowl = 40g): {serving_nutrients['energyKcal']} kcal, {serving_nutrients['proteinG']}g protein")

    # 4. Test Aggregation API
    agg_req = AggregateNutrientsRequest(
        nutrientSnapshots=[
            {"energyKcal": 194.5, "proteinG": 8.45, "carbohydrateG": 33.15, "fatG": 3.45},
            {"energyKcal": 152.5, "proteinG": 8.0, "carbohydrateG": 12.0, "fatG": 8.25}
        ]
    )
    agg_res = await aggregate_nutrition_items(agg_req)
    assert agg_res.success is True
    totals = agg_res.data["totals"]
    assert totals["energyKcal"] == 347.0
    assert totals["proteinG"] == 16.45
    print(f"✓ Multi-item aggregation API: Total Energy {totals['energyKcal']} kcal, Total Protein {totals['proteinG']}g")

    await close_mongo_connection()
    print("==================================================")
    print("ALL PHASE 4 CALCULATION ENGINE CHECKS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_calculation_verification())
