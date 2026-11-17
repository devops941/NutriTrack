import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, 'backend')
load_dotenv('backend/.env')

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

CATEGORIES = [
    {"name": "Grains & Cereals", "slug": "grains", "description": "Rice, oats, wheat, millets, quinoa, breads"},
    {"name": "Dairy & Alternatives", "slug": "dairy", "description": "Milk, yogurt, cheese, paneer, plant milks"},
    {"name": "Fruits", "slug": "fruits", "description": "Fresh and dried fruits"},
    {"name": "Vegetables", "slug": "vegetables", "description": "Leafy greens, roots, tubers, cruciferous"},
    {"name": "Legumes & Pulses", "slug": "legumes", "description": "Lentils, chickpeas, beans, peas, edamame"},
    {"name": "Nuts & Seeds", "slug": "nuts-seeds", "description": "Almonds, walnuts, chia, flax, pumpkin seeds"},
    {"name": "Poultry, Meat & Seafood", "slug": "protein-sources", "description": "Eggs, chicken, fish, meats"},
    {"name": "Packaged Snacks & Beverages", "slug": "packaged-snacks", "description": "Biscuits, chips, drinks, juices"}
]

REFERENCE_FOODS = [
    {
        "name": "Rolled Oats",
        "normalizedName": "rolled oats",
        "brand": "Standard Harvest",
        "categorySlug": "grains",
        "basis": {"amount": 100.0, "unit": "g"},
        "nutrients": {
            "energyKcal": 389.0,
            "proteinG": 16.9,
            "carbohydrateG": 66.3,
            "fatG": 6.9,
            "fiberG": 10.6,
            "sugarsG": 0.9,
            "sodiumMg": 2.0
        },
        "servings": [
            {"name": "1 cup (dry)", "grams": 80.0},
            {"name": "1 standard bowl", "grams": 40.0}
        ],
        "source": {"name": "ICMR-NIN Indian Food Composition Table", "referenceId": "IFCT-A001"},
        "verificationStatus": "verified"
    },
    {
        "name": "Whole Milk (Cow)",
        "normalizedName": "whole milk (cow)",
        "brand": "Dairy Pure",
        "categorySlug": "dairy",
        "basis": {"amount": 100.0, "unit": "ml"},
        "nutrients": {
            "energyKcal": 61.0,
            "proteinG": 3.2,
            "carbohydrateG": 4.8,
            "fatG": 3.3,
            "fiberG": 0.0,
            "sugarsG": 5.0,
            "sodiumMg": 43.0
        },
        "servings": [
            {"name": "1 glass", "grams": 250.0},
            {"name": "1 cup", "grams": 200.0}
        ],
        "source": {"name": "ICMR-NIN Indian Food Composition Table", "referenceId": "IFCT-B002"},
        "verificationStatus": "verified"
    },
    {
        "name": "Fresh Banana",
        "normalizedName": "fresh banana",
        "brand": "Farm Fresh",
        "categorySlug": "fruits",
        "basis": {"amount": 100.0, "unit": "g"},
        "nutrients": {
            "energyKcal": 89.0,
            "proteinG": 1.1,
            "carbohydrateG": 22.8,
            "fatG": 0.3,
            "fiberG": 2.6,
            "sugarsG": 12.2,
            "sodiumMg": 1.0
        },
        "servings": [
            {"name": "1 medium banana", "grams": 118.0},
            {"name": "1 small banana", "grams": 80.0}
        ],
        "source": {"name": "USDA Standard Reference & IFCT", "referenceId": "USDA-09040"},
        "verificationStatus": "verified"
    },
    {
        "name": "Cooked Brown Rice",
        "normalizedName": "cooked brown rice",
        "brand": "Nature's Grain",
        "categorySlug": "grains",
        "basis": {"amount": 100.0, "unit": "g"},
        "nutrients": {
            "energyKcal": 111.0,
            "proteinG": 2.6,
            "carbohydrateG": 23.0,
            "fatG": 0.9,
            "fiberG": 1.8,
            "sugarsG": 0.4,
            "sodiumMg": 5.0
        },
        "servings": [
            {"name": "1 cup cooked", "grams": 195.0},
            {"name": "1 small katori/bowl", "grams": 100.0}
        ],
        "source": {"name": "ICMR-NIN Indian Food Composition Table", "referenceId": "IFCT-A012"},
        "verificationStatus": "verified"
    },
    {
        "name": "Yellow Moong Dal (Cooked)",
        "normalizedName": "yellow moong dal (cooked)",
        "brand": "Traditional Recipe",
        "categorySlug": "legumes",
        "basis": {"amount": 100.0, "unit": "g"},
        "nutrients": {
            "energyKcal": 105.0,
            "proteinG": 7.0,
            "carbohydrateG": 18.0,
            "fatG": 0.8,
            "fiberG": 4.5,
            "sugarsG": 1.1,
            "sodiumMg": 120.0
        },
        "servings": [
            {"name": "1 medium katori", "grams": 150.0}
        ],
        "source": {"name": "ICMR-NIN Indian Food Composition Table", "referenceId": "IFCT-C004"},
        "verificationStatus": "verified"
    },
    {
        "name": "Fresh Paneer (Cottage Cheese)",
        "normalizedName": "fresh paneer (cottage cheese)",
        "brand": "Artisan Dairy",
        "categorySlug": "dairy",
        "basis": {"amount": 100.0, "unit": "g"},
        "nutrients": {
            "energyKcal": 265.0,
            "proteinG": 18.3,
            "carbohydrateG": 3.4,
            "fatG": 20.8,
            "fiberG": 0.0,
            "sugarsG": 2.2,
            "sodiumMg": 18.0
        },
        "servings": [
            {"name": "1 serving cube slice", "grams": 50.0}
        ],
        "source": {"name": "ICMR-NIN Indian Food Composition Table", "referenceId": "IFCT-B014"},
        "verificationStatus": "verified"
    },
    {
        "name": "Raw Almonds",
        "normalizedName": "raw almonds",
        "brand": "NutriOrchard",
        "categorySlug": "nuts-seeds",
        "basis": {"amount": 100.0, "unit": "g"},
        "nutrients": {
            "energyKcal": 579.0,
            "proteinG": 21.2,
            "carbohydrateG": 21.6,
            "fatG": 49.9,
            "fiberG": 12.5,
            "sugarsG": 4.4,
            "sodiumMg": 1.0
        },
        "servings": [
            {"name": "1 handful (23 almonds)", "grams": 28.0}
        ],
        "source": {"name": "USDA National Nutrient Database", "referenceId": "USDA-12061"},
        "verificationStatus": "verified"
    },
    {
        "name": "Boiled Whole Egg",
        "normalizedName": "boiled whole egg",
        "brand": "Farm Direct",
        "categorySlug": "protein-sources",
        "basis": {"amount": 100.0, "unit": "g"},
        "nutrients": {
            "energyKcal": 155.0,
            "proteinG": 12.6,
            "carbohydrateG": 1.1,
            "fatG": 10.6,
            "fiberG": 0.0,
            "sugarsG": 1.1,
            "sodiumMg": 124.0
        },
        "servings": [
            {"name": "1 large egg", "grams": 50.0}
        ],
        "source": {"name": "USDA Standard Reference", "referenceId": "USDA-01129"},
        "verificationStatus": "verified"
    }
]

async def seed():
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DATABASE", "carequeue")

    print(f"Connecting to MongoDB Atlas [{db_name}]...")
    client = AsyncIOMotorClient(uri)
    db = client[db_name]
    await client.admin.command("ping")

    print(f"Creating food taxonomy indexes in {db_name}...")
    await db.food_categories.create_index("slug", unique=True)
    await db.foods.create_index([("normalizedName", "text"), ("name", "text"), ("brand", "text")])
    await db.foods.create_index("categoryId")
    await db.foods.create_index("verificationStatus")
    await db.foods.create_index("barcode")

    print("Seeding Food Categories...")
    category_id_map = {}
    for cat in CATEGORIES:
        res = await db.food_categories.find_one_and_update(
            {"slug": cat["slug"]},
            {"$set": cat},
            upsert=True,
            return_document=True
        )
        category_id_map[cat["slug"]] = res["_id"]
    print(f"✓ {len(CATEGORIES)} food categories active")

    print("Seeding Reference Foods...")
    now = datetime.now(timezone.utc)
    seeded_count = 0
    for food in REFERENCE_FOODS:
        slug = food["categorySlug"]
        cat_id = category_id_map.get(slug)
        doc = food.copy()
        del doc["categorySlug"]
        doc["categoryId"] = cat_id
        doc["createdAt"] = now
        doc["updatedAt"] = now

        await db.foods.update_one(
            {"normalizedName": doc["normalizedName"]},
            {"$set": doc},
            upsert=True
        )
        seeded_count += 1
        print(f"  + Seeded: {doc['name']}")

    print(f"✓ Successfully seeded {seeded_count} reference foods in {db_name} database!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
