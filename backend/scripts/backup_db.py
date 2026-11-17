import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from bson import json_util

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

BACKUP_COLLECTIONS = [
    "users",
    "user_profiles",
    "food_categories",
    "foods",
    "reference_sets",
    "user_targets",
    "meals",
    "saved_meals",
    "meal_plans",
    "reports"
]

async def backup_database():
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_dir = backend_dir / "backups" / f"backup_{timestamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Connecting to MongoDB database '{settings.MONGODB_DATABASE}'...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]
    
    print(f"Exporting database collections to {backup_dir}...")
    manifest = {
        "timestamp": timestamp,
        "database": settings.MONGODB_DATABASE,
        "collections": {}
    }
    
    for coll_name in BACKUP_COLLECTIONS:
        coll = db[coll_name]
        docs = []
        async for doc in coll.find({}):
            docs.append(doc)
            
        file_path = backup_dir / f"{coll_name}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(json_util.dumps(docs, indent=2))
            
        manifest["collections"][coll_name] = len(docs)
        print(f"  ✓ Exported {len(docs)} documents from '{coll_name}'")
        
    with open(backup_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    print(f"✓ Backup successfully completed at: {backup_dir}")
    client.close()

if __name__ == "__main__":
    asyncio.run(backup_database())
