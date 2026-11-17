import asyncio
import sys
import os
from pathlib import Path
from bson import ObjectId
import openpyxl

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
from app.modules.meal_plans.router import (
    save_meal_plan,
    get_meal_plan_for_day,
    get_planned_vs_actual_variance,
    delete_meal_plan
)
from app.modules.meal_plans.schemas import MealPlanRequest, PlannedMeal, PlannedFoodItem
from app.modules.reports.router import generate_report, list_reports
from app.modules.reports.schemas import ReportGenerateRequest

async def run_phase9_tests():
    print("=" * 50)
    print("PHASE 9 MEAL PLANNER & MULTI-FORMAT REPORTS TEST")
    print("=" * 50)

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]
    
    test_user_id = str(ObjectId())
    mock_user = {
        "_id": ObjectId(test_user_id),
        "email": "phase9_tester@nutritrack.io",
        "roles": ["standard_user"]
    }

    created_files = []

    try:
        test_date = "2026-11-20"

        # ----------------------------------------------------
        # 1. Test Smart Meal Planner Creation & Totals
        # ----------------------------------------------------
        print("\n1. Testing POST /meal-plans (Create Planned Day)...")
        plan_req = MealPlanRequest(
            date=test_date,
            title="Balanced Workout Day Plan",
            notes="Aim for lean protein and complex carbs.",
            meals=[
                PlannedMeal(
                    mealType="breakfast",
                    name="Oatmeal & Berries",
                    items=[
                        PlannedFoodItem(
                            name="Rolled Oats",
                            portionGrams=80.0,
                            nutrients={"energyKcal": 310.0, "proteinG": 10.0, "carbohydrateG": 55.0, "fatG": 5.0, "fiberG": 8.0}
                        )
                    ]
                ),
                PlannedMeal(
                    mealType="lunch",
                    name="Grilled Chicken & Brown Rice",
                    items=[
                        PlannedFoodItem(
                            name="Chicken Breast",
                            portionGrams=150.0,
                            nutrients={"energyKcal": 250.0, "proteinG": 45.0, "carbohydrateG": 0.0, "fatG": 4.0, "fiberG": 0.0}
                        ),
                        PlannedFoodItem(
                            name="Brown Rice",
                            portionGrams=150.0,
                            nutrients={"energyKcal": 215.0, "proteinG": 5.0, "carbohydrateG": 45.0, "fatG": 2.0, "fiberG": 3.0}
                        )
                    ]
                )
            ]
        )

        plan_resp = await save_meal_plan(body=plan_req, current_user=mock_user, db=db)
        assert plan_resp.success is True
        plan_data = plan_resp.data
        assert plan_data.date == test_date
        assert plan_data.plannedDailyTotals["energyKcal"] == 775.0  # 310 + 250 + 215
        assert plan_data.plannedDailyTotals["proteinG"] == 60.0    # 10 + 45 + 5
        print(f"✓ Planned Day saved! Planned calories: {plan_data.plannedDailyTotals['energyKcal']} kcal, protein: {plan_data.plannedDailyTotals['proteinG']}g")

        # 2. Test Fetching Day Plan
        print("\n2. Testing GET /meal-plans/day...")
        day_resp = await get_meal_plan_for_day(date=test_date, current_user=mock_user, db=db)
        assert day_resp.success is True
        assert day_resp.data is not None
        assert day_resp.data.title == "Balanced Workout Day Plan"
        print(f"✓ Retrieved meal plan for {test_date} with {len(day_resp.data.meals)} planned meals")

        # 3. Test Planned vs Actual Variance Calculation
        print("\n3. Testing GET /meal-plans/variance...")
        # Insert an actual logged diary meal for test_date: 740 kcal, 56g protein
        actual_meal = {
            "userId": test_user_id,
            "date": test_date,
            "mealType": "lunch",
            "name": "Actual Lunch Consumed",
            "totalNutrients": {
                "energyKcal": 740.0,
                "proteinG": 56.0,
                "carbohydrateG": 90.0,
                "fatG": 10.0,
                "fiberG": 9.0,
                "sodiumMg": 600.0
            }
        }
        await db.meals.insert_one(actual_meal)

        variance_resp = await get_planned_vs_actual_variance(date=test_date, current_user=mock_user, db=db)
        assert variance_resp.success is True
        v_data = variance_resp.data
        assert v_data.hasPlannedMeal is True
        assert v_data.hasActualMeals is True
        
        cal_variance = next(i for i in v_data.items if i.nutrient == "energyKcal")
        assert cal_variance.planned == 775.0
        assert cal_variance.actual == 740.0
        assert cal_variance.variance == -35.0  # 740 - 775 = -35.0
        assert cal_variance.status == "on_target"  # -4.5% is within +/- 10%
        print(f"✓ Calorie Variance: Planned={cal_variance.planned}, Actual={cal_variance.actual}, Diff={cal_variance.variance} kcal ({cal_variance.variancePercentage}%) Status={cal_variance.status}")

        # ----------------------------------------------------
        # 4. Test Multi-Format Report Generation Engine
        # ----------------------------------------------------
        print("\n4. Testing Multi-Format Report Generation Engine...")

        # A. PDF Generation
        print("  A. Generating PDF Report (ReportLab)...")
        pdf_req = ReportGenerateRequest(
            format="pdf",
            startDate="2026-11-14",
            endDate="2026-11-20"
        )
        pdf_resp = await generate_report(body=pdf_req, current_user=mock_user, db=db)
        assert pdf_resp.success is True
        assert pdf_resp.data.format == "pdf"
        assert pdf_resp.data.fileSize > 0
        pdf_file = await db.reports.find_one({"_id": ObjectId(pdf_resp.data.id)})
        assert os.path.exists(pdf_file["filePath"])
        created_files.append(pdf_file["filePath"])
        print(f"  ✓ PDF generated: {pdf_resp.data.fileName} ({pdf_resp.data.fileSize} bytes)")

        # B. Excel Generation
        print("  B. Generating Excel Report (openpyxl)...")
        xlsx_req = ReportGenerateRequest(
            format="excel",
            startDate="2026-11-14",
            endDate="2026-11-20"
        )
        xlsx_resp = await generate_report(body=xlsx_req, current_user=mock_user, db=db)
        assert xlsx_resp.success is True
        assert xlsx_resp.data.format == "excel"
        xlsx_file = await db.reports.find_one({"_id": ObjectId(xlsx_resp.data.id)})
        assert os.path.exists(xlsx_file["filePath"])
        created_files.append(xlsx_file["filePath"])
        
        # Verify workbook structure
        wb = openpyxl.load_workbook(xlsx_file["filePath"])
        assert "Intake Summary" in wb.sheetnames
        assert "Daily Intake Timeline" in wb.sheetnames
        assert "Macronutrient Split" in wb.sheetnames
        wb.close()
        print(f"  ✓ Excel generated: {xlsx_resp.data.fileName} with 3 verified sheets")

        # C. CSV Generation
        print("  C. Generating CSV Report...")
        csv_req = ReportGenerateRequest(
            format="csv",
            startDate="2026-11-14",
            endDate="2026-11-20"
        )
        csv_resp = await generate_report(body=csv_req, current_user=mock_user, db=db)
        assert csv_resp.success is True
        assert csv_resp.data.format == "csv"
        csv_file = await db.reports.find_one({"_id": ObjectId(csv_resp.data.id)})
        assert os.path.exists(csv_file["filePath"])
        created_files.append(csv_file["filePath"])
        print(f"  ✓ CSV generated: {csv_resp.data.fileName} ({csv_resp.data.fileSize} bytes)")

        # 5. Test Reports History Listing
        print("\n5. Testing GET /reports (List History)...")
        history_resp = await list_reports(current_user=mock_user, db=db)
        assert history_resp.success is True
        assert len(history_resp.data) >= 3
        formats = [r.format for r in history_resp.data]
        assert "pdf" in formats
        assert "excel" in formats
        assert "csv" in formats
        print(f"✓ Reports history verified: {formats}")

        print("\n" + "=" * 50)
        print("ALL PHASE 9 PLANNER & REPORT CHECKS PASSED 100%!")
        print("=" * 50)

    finally:
        # Cleanup DB
        await db.meal_plans.delete_many({"userId": test_user_id})
        await db.meals.delete_many({"userId": test_user_id})
        await db.reports.delete_many({"userId": test_user_id})
        # Cleanup files on disk
        for p in created_files:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass
        client.close()

if __name__ == "__main__":
    asyncio.run(run_phase9_tests())
