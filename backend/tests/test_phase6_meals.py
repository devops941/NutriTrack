import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, 'backend')
load_dotenv('backend/.env')

from app.config.database import connect_to_mongo, close_mongo_connection, get_database
from app.modules.meals.schemas import (
    MealCreate,
    MealItemInput,
    SaveMealTemplateRequest
)
from app.modules.meals.router import (
    log_meal,
    get_daily_diary,
    get_meal_by_id,
    save_meal_template,
    delete_meal
)
from bson import ObjectId
from datetime import datetime, timezone

async def run_meal_verification():
    print("==================================================")
    print("PHASE 6 MEAL DIARY & SNAPSHOTS VERIFICATION")
    print("==================================================")

    await connect_to_mongo()
    db = get_database()
    assert db is not None, "Atlas database connection failed"

    # 1. Fetch reference foods
    oats = await db.foods.find_one({"normalizedName": "rolled oats"})
    milk = await db.foods.find_one({"normalizedName": "whole milk (cow)"})
    assert oats is not None and milk is not None, "Seeded reference foods must exist"

    oats_id = str(oats["_id"])
    milk_id = str(milk["_id"])

    mock_user = {
        "id": str(ObjectId()),
        "fullName": "Phase 6 Diary Tester",
        "roles": ["standard_user"]
    }

    test_date_str = "2026-11-17"
    now_dt = datetime.now(timezone.utc)

    # 2. Log a Breakfast Meal (50g Oats + 200ml Milk)
    meal_payload = MealCreate(
        mealType="breakfast",
        consumedAt=now_dt,
        dateStr=test_date_str,
        items=[
            MealItemInput(foodId=oats_id, quantity=50.0, unit="g"),
            MealItemInput(foodId=milk_id, quantity=200.0, unit="ml")
        ],
        notes="Hearty healthy breakfast"
    )

    log_res = await log_meal(payload=meal_payload, current_user=mock_user)
    assert log_res.success is True
    meal_data = log_res.data
    meal_id = meal_data["id"]
    assert len(meal_data["items"]) == 2
    print(f"✓ Breakfast logged. ID: {meal_id}, Items: {len(meal_data['items'])}")

    # Verify item snapshots
    oats_item = next(i for i in meal_data["items"] if i["foodId"] == oats_id)
    assert oats_item["foodNameSnapshot"] == "Rolled Oats"
    assert oats_item["nutrientSnapshot"]["energyKcal"] == 194.5
    assert oats_item["nutrientSnapshot"]["proteinG"] == 8.45

    milk_item = next(i for i in meal_data["items"] if i["foodId"] == milk_id)
    assert milk_item["foodNameSnapshot"] == "Whole Milk (Cow)"
    assert milk_item["nutrientSnapshot"]["energyKcal"] == 122.0
    assert milk_item["nutrientSnapshot"]["proteinG"] == 6.4

    # Breakfast total = 194.5 + 122.0 = 316.5 kcal
    assert meal_data["mealTotals"]["energyKcal"] == 316.5
    assert meal_data["mealTotals"]["proteinG"] == 14.85
    print(f"✓ Meal totals verified: {meal_data['mealTotals']['energyKcal']} kcal, {meal_data['mealTotals']['proteinG']}g protein")

    # 3. CRITICAL SPEC TEST: Mutate Oats Food Master Record
    # Simulate an admin editing Oats to 999.0 kcal
    original_oats_cals = oats["nutrients"]["energyKcal"]
    await db.foods.update_one({"_id": ObjectId(oats_id)}, {"$set": {"nutrients.energyKcal": 999.0}})
    print("✓ Temporarily altered master food record to 999.0 kcal...")

    # Fetch previously logged meal from DB
    retrieved_meal_res = await get_meal_by_id(meal_id=meal_id, current_user=mock_user)
    assert retrieved_meal_res.success is True
    retrieved_items = retrieved_meal_res.data["items"]
    retrieved_oats = next(i for i in retrieved_items if i["foodId"] == oats_id)

    # Historical snapshot MUST remain 194.5 kcal!
    assert retrieved_oats["nutrientSnapshot"]["energyKcal"] == 194.5
    print(f"✓ CRITICAL TEST PASSED: Historical meal snapshot remained {retrieved_oats['nutrientSnapshot']['energyKcal']} kcal (IMMUTABLE SNAPSHOT PRESERVED!)")

    # Restore master oats record
    await db.foods.update_one({"_id": ObjectId(oats_id)}, {"$set": {"nutrients.energyKcal": original_oats_cals}})
    print("✓ Master food record restored to original value")

    # 4. Test Daily Diary Summary API (/meals/daily)
    daily_res = await get_daily_diary(date=test_date_str, current_user=mock_user)
    assert daily_res.success is True
    summary = daily_res.data
    assert summary["date"] == test_date_str
    assert summary["mealsCount"] == 1
    assert summary["itemsCount"] == 2
    assert summary["dailyTotals"]["energyKcal"] == 316.5
    assert summary["dailyTotals"]["proteinG"] == 14.85
    print(f"✓ Daily Diary verified for {test_date_str}: {summary['dailyTotals']['energyKcal']} kcal across {summary['mealsCount']} meals")

    # 5. Test Save Meal Template
    template_req = SaveMealTemplateRequest(
        name="Quick High Protein Oatmeal",
        mealType="breakfast",
        items=[
            MealItemInput(foodId=oats_id, quantity=50.0, unit="g"),
            MealItemInput(foodId=milk_id, quantity=200.0, unit="ml")
        ]
    )
    tmpl_res = await save_meal_template(payload=template_req, current_user=mock_user)
    assert tmpl_res.success is True
    print(f"✓ Saved meal template created: '{tmpl_res.data['name']}' (ID: {tmpl_res.data['templateId']})")

    # 6. Test Delete Meal
    del_res = await delete_meal(meal_id=meal_id, current_user=mock_user)
    assert del_res.success is True
    print("✓ Meal record successfully deleted")

    # Clean up template
    await db.saved_meals.delete_one({"_id": ObjectId(tmpl_res.data["templateId"])})
    await close_mongo_connection()

    print("==================================================")
    print("ALL PHASE 6 MEAL DIARY CHECKS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_meal_verification())
