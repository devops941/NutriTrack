import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
from app.core.security import hash_password

async def check_users():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client["nutriTrack"]
    
    users = []
    async for u in db.users.find({}):
        users.append(u)
        
    print(f"Total users found: {len(users)}")
    for u in users:
        print(f"Email: {u.get('email')} | Roles: {u.get('roles')} | Status: {u.get('status')}")
        
    # Also seed a reliable demo user and administrator if not already present with known password
    demo_email = "demo@nutritrack.io"
    demo_pass = "NutriTrack@2026"
    
    admin_email = "admin@nutritrack.io"
    admin_pass = "Admin@123456"
    
    # Upsert Demo User
    demo_hash = hash_password(demo_pass)
    await db.users.update_one(
        {"email": demo_email},
        {
            "$set": {
                "email": demo_email,
                "passwordHash": demo_hash,
                "roles": ["standard_user"],
                "status": "active"
            }
        },
        upsert=True
    )
    print(f"✓ Demo account ready: {demo_email} / {demo_pass}")
    
    # Upsert Admin User
    admin_hash = hash_password(admin_pass)
    await db.users.update_one(
        {"email": admin_email},
        {
            "$set": {
                "email": admin_email,
                "passwordHash": admin_hash,
                "roles": ["administrator", "nutrition_analyst", "standard_user"],
                "status": "active"
            }
        },
        upsert=True
    )
    print(f"✓ Admin account ready: {admin_email} / {admin_pass}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_users())
