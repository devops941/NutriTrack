import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

async def inspect():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    dbs = await client.list_database_names()
    print("Clusters databases:", dbs)
    for db_name in dbs:
        if "nutri" in db_name.lower() or "care" in db_name.lower():
            collections = await client[db_name].list_collection_names()
            print(f"Database: '{db_name}' -> Collections: {collections}")
    client.close()

if __name__ == "__main__":
    asyncio.run(inspect())
