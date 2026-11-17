import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from pymongo import MongoClient
from app.config.settings import settings

c = MongoClient(settings.MONGODB_URI)
db = c["nutriTrack"]

db.users.update_one({"email": "admin@gmail.com"}, {"$set": {"fullName": "Super Administrator"}})
db.users.update_one({"email": "demo@nutritrack.io"}, {"$set": {"fullName": "Demo User"}})
db.users.update_one({"email": "admin@nutritrack.io"}, {"$set": {"fullName": "System Admin"}})

print("All users updated:")
for u in db.users.find({}):
    print(f"  • {u.get('email')} -> fullName: {u.get('fullName')}")

c.close()
