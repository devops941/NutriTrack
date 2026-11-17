import asyncio
import sys
from pathlib import Path
from bson import ObjectId
from datetime import datetime, timedelta

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
from app.modules.analytics.router import get_analytics_summary, get_custom_range_analytics

async def run_phase8_tests():
    print("=" * 50)
    print("PHASE 8 NUTRITION ANALYTICS & TRENDS TEST")
    print("=" * 50)

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]
    
    test_user_id = str(ObjectId())
    mock_user = {
        "_id": ObjectId(test_user_id),
        "email": "phase8_analyst@nutritrack.io",
        "roles": ["standard_user"]
    }

    try:
        today = datetime.now().date()
        d_day4 = (today - timedelta(days=4)).isoformat()
        d_day2 = (today - timedelta(days=2)).isoformat()
        d_today = today.isoformat()

        # Seed 3 days of meal records
        sample_meals = [
            {
                "userId": test_user_id,
                "date": d_day4,
                "mealType": "dinner",
                "name": "High Protein Dinner",
                "totalNutrients": {
                    "energyKcal": 2000.0,
                    "proteinG": 100.0,
                    "carbohydrateG": 200.0,
                    "fatG": 60.0,
                    "fiberG": 25.0,
                    "sodiumMg": 1800.0
                }
            },
            {
                "userId": test_user_id,
                "date": d_day2,
                "mealType": "dinner",
                "name": "Heavy Meal",
                "totalNutrients": {
                    "energyKcal": 2400.0,
                    "proteinG": 120.0,
                    "carbohydrateG": 240.0,
                    "fatG": 80.0,
                    "fiberG": 30.0,
                    "sodiumMg": 2200.0
                }
            },
            {
                "userId": test_user_id,
                "date": d_today,
                "mealType": "lunch",
                "name": "Light Lunch",
                "totalNutrients": {
                    "energyKcal": 1600.0,
                    "proteinG": 80.0,
                    "carbohydrateG": 160.0,
                    "fatG": 50.0,
                    "fiberG": 20.0,
                    "sodiumMg": 1500.0
                }
            }
        ]
        await db.meals.insert_many(sample_meals)
        print(f"✓ Seeded 3 test meals across 7-day range for user {test_user_id}")

        # 1. Test 7-Day Analytics Summary
        print("\n1. Testing GET /analytics/summary?days=7...")
        summary_resp = await get_analytics_summary(days=7, current_user=mock_user, db=db)
        assert summary_resp.success is True
        data = summary_resp.data

        # Period & Completeness
        assert data.period.totalDays == 7
        assert data.completeness.loggedDays == 3
        assert data.completeness.unloggedDays == 4
        assert data.completeness.completenessRatio == 0.43
        print(f"✓ Completeness verified: {data.completeness.loggedDays}/7 logged days ({data.completeness.completenessPercentage}%)")
        print(f"✓ Observation note: {data.completeness.observationNote}")

        # Statistical Averages on Logged Days
        # Calories: (2000 + 2400 + 1600) / 3 = 2000.0
        cal_stats = data.statistics["energyKcal"]
        assert cal_stats.mean == 2000.0
        assert cal_stats.median == 2000.0
        assert cal_stats.min == 1600.0
        assert cal_stats.max == 2400.0
        assert cal_stats.stdDev == 400.0  # sample std dev of 1600, 2000, 2400 is 400.0
        print(f"✓ Calories Stats: Mean={cal_stats.mean}, Median={cal_stats.median}, Min={cal_stats.min}, Max={cal_stats.max}, StdDev={cal_stats.stdDev}")

        # Protein: (100 + 120 + 80) / 3 = 100.0g
        prot_stats = data.statistics["proteinG"]
        assert prot_stats.mean == 100.0
        print(f"✓ Protein Stats: Mean={prot_stats.mean}g, Min={prot_stats.min}g, Max={prot_stats.max}g")

        # Macronutrient Caloric Distribution (4 / 4 / 9 formula)
        dist = data.macroDistribution
        assert dist.proteinGrams == 100.0
        assert dist.proteinCalories == 400.0
        assert dist.carbsCalories == 800.0
        assert dist.fatCalories == 569.7  # 63.3g * 9 = 569.7 kcal
        print(f"✓ Caloric Macro Split: Protein={dist.proteinPercentage}%, Carbs={dist.carbsPercentage}%, Fat={dist.fatPercentage}%")

        # Trend Series
        assert len(data.trendSeries) == 7
        logged_points = [p for p in data.trendSeries if p.isLogged]
        unlogged_points = [p for p in data.trendSeries if not p.isLogged]
        assert len(logged_points) == 3
        assert len(unlogged_points) == 4
        print(f"✓ Trend series contains {len(data.trendSeries)} points (3 logged, 4 unlogged with 0 calories)")

        # 2. Test Custom Range Analytics
        print("\n2. Testing GET /analytics/daily (custom range)...")
        custom_resp = await get_custom_range_analytics(
            startDate=d_day4,
            endDate=d_today,
            current_user=mock_user,
            db=db
        )
        assert custom_resp.success is True
        assert custom_resp.data.period.totalDays == 5  # d_day4 through d_today = 5 days
        assert custom_resp.data.completeness.loggedDays == 3
        print(f"✓ Custom range (5 days) evaluated cleanly with {custom_resp.data.completeness.loggedDays} logged entries")

        print("\n" + "=" * 50)
        print("ALL PHASE 8 NUTRITION ANALYTICS CHECKS PASSED 100%!")
        print("=" * 50)

    finally:
        await db.meals.delete_many({"userId": test_user_id})
        client.close()

if __name__ == "__main__":
    asyncio.run(run_phase8_tests())
