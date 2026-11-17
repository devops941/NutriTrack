import asyncio
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

REFERENCE_SETS = [
    {
        "code": "ICMR_ADULT_SEDENTARY_MALE",
        "name": "ICMR-NIN 2020 RDA - Indian Adult Male (Sedentary)",
        "jurisdiction": "India",
        "population": "Adult Male (19-39 years, 65kg)",
        "source": "ICMR - National Institute of Nutrition (2020 Recommended Dietary Allowances)",
        "targets": {
            "energyKcal": 2110.0,
            "proteinG": 54.0,
            "carbohydrateG": 260.0,
            "fatG": 30.0,
            "fiberG": 30.0,
            "sodiumMg": 2000.0,
            "calciumMg": 1000.0,
            "ironMg": 19.0,
            "vitaminCMg": 80.0
        },
        "description": "Standard dietary reference targets based on the 2020 ICMR-NIN expert group report for adult males with sedentary physical activity."
    },
    {
        "code": "ICMR_ADULT_SEDENTARY_FEMALE",
        "name": "ICMR-NIN 2020 RDA - Indian Adult Female (Sedentary)",
        "jurisdiction": "India",
        "population": "Adult Female (19-39 years, 55kg)",
        "source": "ICMR - National Institute of Nutrition (2020 Recommended Dietary Allowances)",
        "targets": {
            "energyKcal": 1660.0,
            "proteinG": 46.0,
            "carbohydrateG": 200.0,
            "fatG": 20.0,
            "fiberG": 25.0,
            "sodiumMg": 2000.0,
            "calciumMg": 1000.0,
            "ironMg": 29.0,
            "vitaminCMg": 65.0
        },
        "description": "Standard dietary reference targets based on the 2020 ICMR-NIN expert group report for adult females with sedentary physical activity."
    },
    {
        "code": "WHO_GLOBAL_ADULT",
        "name": "WHO Healthy Diet Global Reference",
        "jurisdiction": "International",
        "population": "General Adult (2000 kcal baseline)",
        "source": "World Health Organization (WHO Healthy Diet Fact Sheet N°394)",
        "targets": {
            "energyKcal": 2000.0,
            "proteinG": 50.0,
            "carbohydrateG": 275.0,
            "fatG": 65.0,
            "fiberG": 25.0,
            "sodiumMg": 2000.0,
            "sugarsG": 50.0
        },
        "description": "Global guidance reference for balanced macronutrient intake preventing noncommunicable diseases."
    }
]

async def seed_targets():
    print(f"Connecting to MongoDB at {settings.MONGODB_DATABASE}...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]
    
    print("Seeding authoritative nutrition reference sets...")
    for ref in REFERENCE_SETS:
        await db.reference_sets.update_one(
            {"code": ref["code"]},
            {"$set": ref},
            upsert=True
        )
        print(f"✓ Seeded reference set: {ref['code']} ({ref['name']})")
        
    print(f"Successfully seeded {len(REFERENCE_SETS)} dietary reference sets into 'reference_sets' collection!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_targets())
