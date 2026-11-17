import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, 'backend')
load_dotenv('backend/.env')

from app.config.database import connect_to_mongo, close_mongo_connection, get_database
from app.modules.foods.schemas import FoodCreate, FoodUpdate, NutrientsSchema, BasisSchema
from app.modules.foods.router import (
    list_categories,
    list_and_search_foods,
    get_food_by_id,
    create_food,
    update_food
)
from bson import ObjectId

async def run_food_verification():
    print("==================================================")
    print("PHASE 3 FOOD DATABASE & SEARCH VERIFICATION")
    print("==================================================")

    await connect_to_mongo()
    db = get_database()
    assert db is not None, "Database connection failed"

    # 1. Test Categories
    cat_res = await list_categories()
    assert cat_res.success is True
    categories = cat_res.data
    assert len(categories) >= 8
    print(f"✓ Retrieved {len(categories)} food categories (e.g. {categories[0]['name']}, {categories[1]['name']})")

    grains_cat = next(c for c in categories if c["slug"] == "grains")

    # 2. Test Search & Filter
    search_res = await list_and_search_foods(q="oats", page=1, limit=10)
    assert search_res.success is True
    foods = search_res.data["foods"]
    assert len(foods) >= 1
    assert "oats" in foods[0]["normalizedName"]
    print(f"✓ Search by term 'oats' found {len(foods)} item(s): {foods[0]['name']} ({foods[0]['nutrients']['energyKcal']} kcal)")

    # 3. Test Filter by Category
    dairy_res = await list_and_search_foods(category="dairy", page=1, limit=10)
    assert dairy_res.success is True
    print(f"✓ Category filter 'dairy' retrieved {len(dairy_res.data['foods'])} food(s)")

    # 4. Test Create Food Record
    mock_user = {
        "id": str(ObjectId()),
        "fullName": "Gokul Nutrition Specialist",
        "roles": ["standard_user"]
    }

    test_food_name = "Phase 3 Organic Quinoa Bowl"
    # Clean previous
    await db.foods.delete_many({"name": test_food_name})

    food_payload = FoodCreate(
        name=test_food_name,
        brand="Nature Organics",
        barcode="8901234567890",
        categoryId=grains_cat["id"],
        basis=BasisSchema(amount=100.0, unit="g"),
        nutrients=NutrientsSchema(
            energyKcal=368.0,
            proteinG=14.1,
            carbohydrateG=64.2,
            fatG=6.1,
            fiberG=7.0,
            sugarsG=1.5,
            sodiumMg=5.0
        ),
        verificationStatus="verified"
    )

    create_res = await create_food(food_payload, current_user=mock_user)
    assert create_res.success is True
    new_food_id = create_res.data["id"]
    print(f"✓ Created new food item: {create_res.data['name']} (ID: {new_food_id})")

    # 5. Test Get Food Details by ID
    detail_res = await get_food_by_id(new_food_id)
    assert detail_res.success is True
    assert detail_res.data["name"] == test_food_name
    assert detail_res.data["categoryName"] == "Grains & Cereals"
    print(f"✓ Retrieved food details by ID: Category '{detail_res.data['categoryName']}', Barcode: {detail_res.data['barcode']}")

    # 6. Test Update Food
    update_payload = FoodUpdate(
        nutrients=NutrientsSchema(
            energyKcal=370.0,
            proteinG=14.5
        )
    )
    update_res = await update_food(new_food_id, update_payload, current_user=mock_user)
    assert update_res.success is True
    assert update_res.data["nutrients"]["energyKcal"] == 370.0
    print("✓ Updated food nutrient snapshot verified: Energy 370 kcal, Protein 14.5g")

    # Clean up test food
    await db.foods.delete_one({"_id": ObjectId(new_food_id)})
    await close_mongo_connection()

    print("==================================================")
    print("ALL PHASE 3 FOOD DATABASE VERIFICATIONS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_food_verification())
