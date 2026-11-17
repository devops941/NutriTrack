import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

NUTRITRACK_COLLECTIONS = [
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
    "food_labels",
    "label_extractions",
    "audit_logs",
    "comparison_history"
]

async def migrate_data():
    print("=" * 60)
    print("MIGRATING & PUSHING NUTRITRACK DATA TO 'nutriTrack' DATABASE")
    print("=" * 60)
    
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    src_db = client["carequeue"]
    dst_db = client["nutriTrack"]
    
    total_copied = 0

    for coll_name in NUTRITRACK_COLLECTIONS:
        src_coll = src_db[coll_name]
        dst_coll = dst_db[coll_name]
        
        # Read from source
        docs = []
        async for doc in src_coll.find({}):
            docs.append(doc)
            
        if docs:
            # Upsert into destination to prevent duplicates
            for doc in docs:
                doc_id = doc["_id"]
                await dst_coll.replace_one({"_id": doc_id}, doc, upsert=True)
            print(f"✓ Pushed {len(docs)} documents into 'nutriTrack.{coll_name}'")
            total_copied += len(docs)
        else:
            print(f"- '{coll_name}' has 0 source records (initialized clean).")

    # Initialize Indexes on destination database
    print("\nCreating indexes on 'nutriTrack' database...")
    try:
        await dst_db.users.create_index("email", unique=True)
        await dst_db.user_profiles.create_index("userId", unique=True)
        await dst_db.food_categories.create_index("slug", unique=True)
        await dst_db.foods.create_index([("normalizedName", "text"), ("name", "text")])
        await dst_db.reference_sets.create_index("code", unique=True)
        await dst_db.meals.create_index([("userId", 1), ("dateStr", 1)])
        await dst_db.meals.create_index([("userId", 1), ("consumedAt", 1)])
        await dst_db.meal_plans.create_index([("userId", 1), ("date", 1)], unique=True)
        await dst_db.reports.create_index([("userId", 1), ("generatedAt", -1)])
        print("✓ All indexes created successfully on 'nutriTrack'!")
    except Exception as e:
        print(f"Index notice: {e}")

    # Inspect destination database collections
    dest_colls = await dst_db.list_collection_names()
    print("\n'nutriTrack' Database Collections after migration:")
    for c in dest_colls:
        count = await dst_db[c].count_documents({})
        print(f"  • {c}: {count} documents")

    print("\n" + "=" * 60)
    print(f"SUCCESS: Pushed {total_copied} total documents into 'nutriTrack' database!")
    print("=" * 60)
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_data())
