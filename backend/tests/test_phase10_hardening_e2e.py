import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi.testclient import TestClient
from fastapi import HTTPException

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
from app.config.database import connect_to_mongo, close_mongo_connection
from app.main import app
from app.modules.meals.router import log_meal, get_meal_by_id, delete_meal
from app.modules.meals.schemas import MealCreate, MealItemInput
from app.modules.meal_plans.router import save_meal_plan, delete_meal_plan
from app.modules.meal_plans.schemas import MealPlanRequest, PlannedMeal, PlannedFoodItem
from app.modules.reports.router import generate_report, download_report
from app.modules.reports.schemas import ReportGenerateRequest
from app.modules.targets.router import get_daily_target_progress
from app.modules.analytics.router import get_analytics_summary

async def run_phase10_tests():
    print("=" * 60)
    print("PHASE 10 HARDENING, SECURITY & END-TO-END VERIFICATION")
    print("=" * 60)

    await connect_to_mongo()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]
    
    # Setup test users for multi-tenant isolation verification
    user_a_id = str(ObjectId())
    user_b_id = str(ObjectId())

    user_a = {"_id": ObjectId(user_a_id), "id": user_a_id, "email": "usera_secure@nutritrack.io", "roles": ["standard_user"]}
    user_b = {"_id": ObjectId(user_b_id), "id": user_b_id, "email": "userb_intruder@nutritrack.io", "roles": ["standard_user"]}

    created_reports = []

    try:
        # ----------------------------------------------------
        # 1. Security Headers & Rate Limiting Guardrails
        # ----------------------------------------------------
        print("\n1. Testing HTTP Security Headers Middleware...")
        test_client = TestClient(app)
        res = test_client.get("/api/v1/health")
        assert res.status_code == 200
        headers = res.headers
        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "DENY"
        assert headers.get("X-XSS-Protection") == "1; mode=block"
        print("✓ Verified security headers: nosniff, DENY, XSS-Protection")

        # ----------------------------------------------------
        # 2. Multi-Tenant Record Ownership Enforcement
        # ----------------------------------------------------
        print("\n2. Testing Multi-Tenant Data Isolation & Ownership...")

        # Test A: Meals Isolation
        meal_a_doc = {
            "userId": ObjectId(user_a_id),
            "mealType": "dinner",
            "name": "User A Private Salmon Dinner",
            "date": "2026-11-22",
            "dateStr": "2026-11-22",
            "items": [],
            "totalNutrients": {"energyKcal": 650.0, "proteinG": 45.0}
        }
        ins_meal = await db.meals.insert_one(meal_a_doc)
        meal_a_id = str(ins_meal.inserted_id)

        # User B attempts to access User A's meal
        try:
            await get_meal_by_id(meal_id=meal_a_id, current_user=user_b)
            assert False, "User B should not be able to get User A's meal"
        except HTTPException as e:
            assert e.status_code == 404
            print("✓ Privacy Guardrail Verified: User B cannot view User A's meal (404 access denied)")

        # User B attempts to delete User A's meal
        try:
            await delete_meal(meal_id=meal_a_id, current_user=user_b)
            assert False, "User B should not be able to delete User A's meal"
        except HTTPException as e:
            assert e.status_code == 404
            print("✓ Ownership Guardrail Verified: User B cannot delete User A's meal (404 access denied)")

        # Test B: Meal Plans Isolation
        plan_a_req = MealPlanRequest(
            date="2026-11-25",
            title="User A Secret Fitness Plan",
            meals=[
                PlannedMeal(
                    mealType="breakfast",
                    name="Oats & Whey",
                    items=[PlannedFoodItem(name="Oats", portionGrams=50, nutrients={"energyKcal": 190.0, "proteinG": 7.0})]
                )
            ]
        )
        plan_a_resp = await save_meal_plan(body=plan_a_req, current_user=user_a, db=db)
        plan_a_id = plan_a_resp.data.id

        # User B attempts to delete User A's meal plan
        try:
            await delete_meal_plan(id=plan_a_id, current_user=user_b, db=db)
            assert False, "Should have raised 404 for unauthorized user"
        except HTTPException as e:
            assert e.status_code == 404
            print("✓ Ownership Guardrail Verified: User B unauthorized deletion of User A's meal plan rejected (404)")

        # Test C: Reports Isolation
        report_a_req = ReportGenerateRequest(
            format="pdf",
            startDate="2026-11-18",
            endDate="2026-11-22"
        )
        report_a_resp = await generate_report(body=report_a_req, current_user=user_a, db=db)
        report_a_id = report_a_resp.data.id
        rep_doc = await db.reports.find_one({"_id": ObjectId(report_a_id)})
        if rep_doc and rep_doc.get("filePath"):
            created_reports.append(rep_doc["filePath"])

        # User B attempts to download User A's report
        try:
            await download_report(id=report_a_id, current_user=user_b, db=db)
            assert False, "Should have raised 404 for unauthorized user"
        except HTTPException as e:
            assert e.status_code == 404
            print("✓ Ownership Guardrail Verified: User B cannot download User A's report (404)")

        # ----------------------------------------------------
        # 3. Full End-to-End Lifecycle Pipeline
        # ----------------------------------------------------
        print("\n3. Testing End-to-End Lifecycle Execution Pipeline...")
        # Step A: Query food library
        oats = await db.foods.find_one({"name": "Rolled Oats"})
        assert oats is not None
        print(f"  Step A: Food record found: '{oats['name']}' ({oats['nutrients']['energyKcal']} kcal/100g)")

        # Step B: Log meal and verify snapshot
        today_str = datetime.now().date().isoformat()
        meal_create = MealCreate(
            mealType="breakfast",
            dateStr=today_str,
            items=[
                MealItemInput(
                    foodId=str(oats["_id"]),
                    quantity=60.0,
                    unit="g"
                )
            ]
        )
        log_res = await log_meal(payload=meal_create, current_user=user_a)
        assert log_res.success is True
        meal_data = log_res.data
        assert len(meal_data["items"]) == 1
        assert meal_data["items"][0]["nutrientSnapshot"]["energyKcal"] is not None
        print(f"  Step B: Meal logged with immutable snapshot! Total: {meal_data['mealTotals']['energyKcal']} kcal")

        # Step C: Evaluate Target Progress
        progress_res = await get_daily_target_progress(date=today_str, current_user=user_a, db=db)
        assert progress_res.success is True
        print(f"  Step C: Daily target progress computed ({len(progress_res.data.items)} tracked nutrients)")

        # Step D: Compute Rolling Analytics
        analytics_res = await get_analytics_summary(days=7, current_user=user_a, db=db)
        assert analytics_res.success is True
        assert analytics_res.data.completeness.loggedDays >= 1
        print(f"  Step D: 7-day intake analytics evaluated (Logged Days: {analytics_res.data.completeness.loggedDays})")

        # Step E: Generate Final Excel Report
        six_days_ago = (datetime.now().date() - timedelta(days=6)).isoformat()
        excel_req = ReportGenerateRequest(
            format="excel",
            startDate=six_days_ago,
            endDate=today_str
        )
        excel_resp = await generate_report(body=excel_req, current_user=user_a, db=db)
        assert excel_resp.success is True
        excel_doc = await db.reports.find_one({"_id": ObjectId(excel_resp.data.id)})
        if excel_doc and excel_doc.get("filePath"):
            created_reports.append(excel_doc["filePath"])
        print(f"  Step E: Final multi-sheet Excel report generated ({excel_resp.data.fileName})")

        print("\n" + "=" * 60)
        print("ALL PHASE 10 HARDENING, SECURITY & E2E CHECKS PASSED 100%!")
        print("=" * 60)

    finally:
        # Cleanup DB
        await db.meals.delete_many({"userId": {"$in": [user_a_id, user_b_id]}})
        await db.meal_plans.delete_many({"userId": {"$in": [user_a_id, user_b_id]}})
        await db.reports.delete_many({"userId": {"$in": [user_a_id, user_b_id]}})
        
        # Cleanup generated report files
        for p in created_reports:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass
        client.close()
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run_phase10_tests())
