import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

async def push_to_nutritrack_collection():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client["nutriTrack"]
    coll = db["NutriTrack"]

    # Insert Project Information and Status Document
    project_doc = {
        "projectName": "NutriTrack",
        "description": "Smart Food Label Intelligence & Meal Nutrient Analysis",
        "database": "nutriTrack",
        "status": "Active & Fully Operational",
        "totalPhasesCompleted": 10,
        "completedPhases": [
            "Phase 1: Foundation and Architecture",
            "Phase 2: Authentication and User Profile",
            "Phase 3: Food Database Management and Search",
            "Phase 4: Conversion and Calculation Engine",
            "Phase 5: Food Label OCR Pipeline",
            "Phase 6: Meal Diary and Snapshots",
            "Phase 7: Nutrition Targets and Comparison",
            "Phase 8: Nutrition Analytics and Trends",
            "Phase 9: Smart Meal Planner and Reports",
            "Phase 10: Hardening, Testing, and Deployment"
        ],
        "registeredCollections": [
            "food_categories",
            "foods",
            "reference_sets",
            "users",
            "user_profiles",
            "meals",
            "saved_meals",
            "user_targets",
            "meal_plans",
            "reports",
            "food_labels"
        ],
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }

    await coll.replace_one({"projectName": "NutriTrack"}, project_doc, upsert=True)
    print("✓ Pushed master project document into 'nutriTrack.NutriTrack' collection!")

    # Also push the reference food items into NutriTrack collection for immediate view in Atlas
    foods_cursor = db.foods.find({})
    async for f in foods_cursor:
        doc = dict(f)
        doc["type"] = "food_reference_record"
        await coll.replace_one({"_id": doc["_id"]}, doc, upsert=True)

    count = await coll.count_documents({})
    print(f"✓ 'nutriTrack.NutriTrack' collection now contains {count} documents!")
    client.close()

if __name__ == "__main__":
    asyncio.run(push_to_nutritrack_collection())
