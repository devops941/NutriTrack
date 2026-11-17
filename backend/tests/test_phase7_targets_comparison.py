import asyncio
import sys
from pathlib import Path
from bson import ObjectId

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
from app.modules.targets.router import (
    list_reference_sets,
    get_user_targets,
    update_user_targets,
    get_daily_target_progress
)
from app.modules.targets.schemas import UserTargetUpdate
from app.modules.comparison.router import compare_foods
from app.modules.comparison.schemas import ComparisonRequest, ProductComparisonResult

async def run_phase7_tests():
    print("=" * 50)
    print("PHASE 7 NUTRITION TARGETS & PRODUCT COMPARISON TEST")
    print("=" * 50)

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]
    
    test_user_id = str(ObjectId())
    mock_user = {
        "_id": ObjectId(test_user_id),
        "email": "phase7_tester@nutritrack.io",
        "roles": ["standard_user"]
    }

    try:
        # 1. Test Reference Sets Listing
        print("\n1. Testing GET /targets/reference-sets...")
        ref_sets_resp = await list_reference_sets(current_user=mock_user, db=db)
        assert ref_sets_resp.success is True
        assert len(ref_sets_resp.data) >= 3
        codes = [r.code for r in ref_sets_resp.data]
        print(f"✓ Found {len(ref_sets_resp.data)} reference sets: {codes}")
        assert "ICMR_ADULT_SEDENTARY_MALE" in codes
        assert "WHO_GLOBAL_ADULT" in codes

        # 2. Test Default User Targets
        print("\n2. Testing GET /targets/me (default)...")
        user_targets_resp = await get_user_targets(current_user=mock_user, db=db)
        assert user_targets_resp.success is True
        assert user_targets_resp.data.referenceSetCode == "ICMR_ADULT_SEDENTARY_MALE"
        assert user_targets_resp.data.effectiveTargets["energyKcal"] == 2110.0
        print(f"✓ Default targets loaded: {user_targets_resp.data.effectiveTargets['energyKcal']} kcal")

        # 3. Test Custom Targets Override
        print("\n3. Testing PUT /targets/me (custom override)...")
        update_req = UserTargetUpdate(
            referenceSetCode="ICMR_ADULT_SEDENTARY_FEMALE",
            customTargets={"proteinG": 65.0, "energyKcal": 1800.0}
        )
        updated_resp = await update_user_targets(body=update_req, current_user=mock_user, db=db)
        assert updated_resp.success is True
        assert updated_resp.data.referenceSetCode == "ICMR_ADULT_SEDENTARY_FEMALE"
        assert updated_resp.data.effectiveTargets["proteinG"] == 65.0  # custom override
        assert updated_resp.data.effectiveTargets["energyKcal"] == 1800.0  # custom override
        assert updated_resp.data.effectiveTargets["calciumMg"] == 1000.0  # inherited from base ref set
        print("✓ Custom overrides saved and merged with base reference set successfully")

        # 4. Test Target Progress Calculation with Logged Meal
        print("\n4. Testing GET /targets/progress with logged meal...")
        test_date = "2026-11-17"
        # Insert a sample meal for test_date
        sample_meal = {
            "userId": test_user_id,
            "mealType": "lunch",
            "name": "Grilled Chicken & Rice",
            "date": test_date,
            "items": [],
            "totalNutrients": {
                "energyKcal": 720.0,
                "proteinG": 48.0,
                "carbohydrateG": 80.0,
                "fatG": 18.0,
                "sodiumMg": 650.0
            }
        }
        await db.meals.insert_one(sample_meal)

        progress_resp = await get_daily_target_progress(date=test_date, current_user=mock_user, db=db)
        assert progress_resp.success is True
        assert progress_resp.data.date == test_date
        assert "not constitute medical advice" in progress_resp.data.disclaimer
        
        # Check protein progress: 48g consumed out of 65g target
        protein_item = next(item for item in progress_resp.data.items if item.nutrient == "proteinG")
        assert protein_item.consumed == 48.0
        assert protein_item.target == 65.0
        assert protein_item.remaining == 17.0
        assert protein_item.progressPercentage == round((48.0 / 65.0) * 100.0, 1)
        assert protein_item.status == "on_track"  # 73.8% is within 70-110%
        print(f"✓ Protein progress: {protein_item.consumed}/{protein_item.target}g ({protein_item.progressPercentage}%) Status: {protein_item.status}")

        # Check energy progress: 720 kcal consumed out of 1800 kcal target
        energy_item = next(item for item in progress_resp.data.items if item.nutrient == "energyKcal")
        assert energy_item.consumed == 720.0
        assert energy_item.target == 1800.0
        assert energy_item.status == "under"  # 40% < 70%
        print(f"✓ Energy progress: {energy_item.consumed}/{energy_item.target} kcal ({energy_item.progressPercentage}%) Status: {energy_item.status}")
        print(f"✓ Legal disclaimer included: {progress_resp.data.disclaimer[:60]}...")

        # 5. Test Product Comparison Engine
        print("\n5. Testing POST /comparison (Product Comparison)...")
        # Fetch 2 foods from db
        foods_cursor = db.foods.find({}).limit(2)
        sample_foods = []
        async for f in foods_cursor:
            sample_foods.append(f)

        assert len(sample_foods) >= 2, "Database must have at least 2 seeded foods"
        f1_id = str(sample_foods[0]["_id"])
        f2_id = str(sample_foods[1]["_id"])
        f1_name = sample_foods[0]["name"]
        f2_name = sample_foods[1]["name"]
        print(f"Comparing '{f1_name}' vs '{f2_name}'...")

        comp_req = ComparisonRequest(foodIds=[f1_id, f2_id], normalizeBasis="per_100g")
        comp_resp = await compare_foods(request=comp_req, current_user=mock_user, db=db)
        assert comp_resp.success is True
        data = ProductComparisonResult.model_validate(comp_resp.data)
        assert len(data.products) == 2
        assert "energyKcal" in data.matrix
        assert len(data.matrix["energyKcal"]) == 2
        assert "energyKcal" in data.deltasVsFirst
        
        # Verify deltas vs first
        p0_energy = data.products[0].nutrients["energyKcal"]
        p1_energy = data.products[1].nutrients["energyKcal"]
        delta_energy = data.deltasVsFirst["energyKcal"][0]
        
        if p0_energy is not None and p1_energy is not None:
            expected_delta = round(p1_energy - p0_energy, 2)
            assert delta_energy == expected_delta
            print(f"✓ Energy delta: {p1_energy} - {p0_energy} = {delta_energy} kcal")
        else:
            assert delta_energy is None
            print("✓ Missing energy data correctly represented as None delta")

        print("✓ Completeness score for Product 1:", data.products[0].completenessScore, "%")
        print("✓ Completeness score for Product 2:", data.products[1].completenessScore, "%")

        print("\n" + "=" * 50)
        print("ALL PHASE 7 NUTRITION TARGETS & COMPARISON CHECKS PASSED 100%!")
        print("=" * 50)

    finally:
        # Cleanup test meal and user targets
        await db.meals.delete_many({"userId": test_user_id})
        await db.user_targets.delete_many({"userId": test_user_id})
        await db.comparison_history.delete_many({"userId": test_user_id})
        client.close()

if __name__ == "__main__":
    asyncio.run(run_phase7_tests())
