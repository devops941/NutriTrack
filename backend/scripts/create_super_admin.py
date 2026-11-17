import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone
from bson import ObjectId

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
from app.core.security import hash_password

async def create_super_admin():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client["nutriTrack"]

    email = "admin@gmail.com"
    raw_password = "Admin@123"
    hashed = hash_password(raw_password)

    roles = [
        "super_administrator",
        "administrator",
        "nutrition_analyst",
        "food_reviewer",
        "standard_user"
    ]

    now = datetime.now(timezone.utc)

    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["_id"]
        await db.users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "email": email,
                    "passwordHash": hashed,
                    "roles": roles,
                    "status": "active",
                    "fullName": "Super Administrator",
                    "updatedAt": now
                }
            }
        )
        print(f"✓ Existing user '{email}' upgraded to Super Admin with password '{raw_password}'")
    else:
        user_id = ObjectId()
        user_doc = {
            "_id": user_id,
            "email": email,
            "passwordHash": hashed,
            "fullName": "Super Administrator",
            "roles": roles,
            "status": "active",
            "createdAt": now,
            "updatedAt": now
        }
        await db.users.insert_one(user_doc)
        print(f"✓ Created new Super Admin '{email}' with password '{raw_password}'")

    # Ensure user profile exists
    profile = await db.user_profiles.find_one({"userId": user_id})
    if not profile:
        profile_doc = {
            "userId": user_id,
            "displayName": "Super Administrator",
            "activityLevel": "moderate",
            "dietaryPreferences": [],
            "allergies": [],
            "excludedIngredients": [],
            "preferredUnits": "metric",
            "dailyCalorieGoal": 2100.0,
            "createdAt": now,
            "updatedAt": now
        }
        await db.user_profiles.insert_one(profile_doc)
        print(f"✓ Created user profile for Super Admin")

    print("\nSuper Admin Credentials Ready:")
    print(f"Email: {email}")
    print(f"Password: {raw_password}")
    print(f"Roles: {roles}")

    client.close()

if __name__ == "__main__":
    asyncio.run(create_super_admin())
