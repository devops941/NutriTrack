from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional, Dict, Any
from datetime import datetime, date, timedelta, timezone, time
from bson import ObjectId

from app.shared.schemas.response import StandardResponse
from app.modules.analytics.schemas import AnalyticsSummaryResponse
from app.engines.analytics_engine import compute_intake_analytics
from app.config.database import get_database
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/analytics", tags=["Nutrition Analytics"])

@router.get("/summary", response_model=StandardResponse[AnalyticsSummaryResponse])
async def get_analytics_summary(
    days: int = Query(7, ge=1, le=90, description="Number of past days to analyze (1 to 90)"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Computes statistical intake analytics and trends for the past N days.
    """
    user_id = str(current_user["_id"])
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days - 1)

    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    start_dt = datetime.combine(start_date, time.min).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date, time.max).replace(tzinfo=timezone.utc)

    user_query = {"$in": [user_id, ObjectId(user_id)]} if ObjectId.is_valid(user_id) else user_id
    # Query meals in date range for this user across date, dateStr, and consumedAt
    cursor = db.meals.find({
        "userId": user_query,
        "$or": [
            {"date": {"$gte": start_str, "$lte": end_str}},
            {"dateStr": {"$gte": start_str, "$lte": end_str}},
            {"consumedAt": {"$gte": start_dt, "$lte": end_dt}}
        ]
    })
    meals = []
    async for m in cursor:
        meals.append(m)

    summary_data = compute_intake_analytics(meals, start_date, end_date)

    return StandardResponse(
        success=True,
        data=AnalyticsSummaryResponse.model_validate(summary_data),
        message=f"Analytics summary for past {days} days calculated successfully"
    )

@router.get("/daily", response_model=StandardResponse[AnalyticsSummaryResponse])
async def get_custom_range_analytics(
    startDate: str = Query(..., description="Start date YYYY-MM-DD"),
    endDate: str = Query(..., description="End date YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Computes analytics across a custom date range.
    """
    user_id = str(current_user["_id"])
    try:
        s_date = datetime.strptime(startDate, "%Y-%m-%d").date()
        e_date = datetime.strptime(endDate, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dates must be in valid YYYY-MM-DD format."
        )

    if s_date > e_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="startDate cannot be after endDate."
        )

    if (e_date - s_date).days > 180:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date range cannot exceed 180 days."
        )

    s_dt = datetime.combine(s_date, time.min).replace(tzinfo=timezone.utc)
    e_dt = datetime.combine(e_date, time.max).replace(tzinfo=timezone.utc)

    user_query = {"$in": [user_id, ObjectId(user_id)]} if ObjectId.is_valid(user_id) else user_id
    cursor = db.meals.find({
        "userId": user_query,
        "$or": [
            {"date": {"$gte": startDate, "$lte": endDate}},
            {"dateStr": {"$gte": startDate, "$lte": endDate}},
            {"consumedAt": {"$gte": s_dt, "$lte": e_dt}}
        ]
    })
    meals = []
    async for m in cursor:
        meals.append(m)

    summary_data = compute_intake_analytics(meals, s_date, e_date)

    return StandardResponse(
        success=True,
        data=AnalyticsSummaryResponse.model_validate(summary_data),
        message="Custom range analytics calculated successfully"
    )

@router.get("/weekly", response_model=StandardResponse[AnalyticsSummaryResponse])
async def get_weekly_analytics(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Convenience endpoint for 7-day intake analytics.
    """
    return await get_analytics_summary(days=7, current_user=current_user, db=db)

@router.get("/monthly", response_model=StandardResponse[AnalyticsSummaryResponse])
async def get_monthly_analytics(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Convenience endpoint for 30-day intake analytics.
    """
    return await get_analytics_summary(days=30, current_user=current_user, db=db)

@router.post("/seed-demo", response_model=StandardResponse[Dict[str, Any]])
async def seed_demo_analytics_data(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Populates sample nutritional meal history across the past 7 days.
    Provides realistic variance, macro distributions, and completeness metrics for project evaluation.
    """
    user_id = str(current_user["_id"])
    user_id_obj = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
    now = datetime.now(timezone.utc)
    today = now.date()

    sample_day_templates = [
        # Day 0 (today)
        [
            {"mealType": "breakfast", "name": "Rolled Oats with Almond Milk & Chia", "energyKcal": 420.0, "proteinG": 16.0, "carbohydrateG": 62.0, "fatG": 12.0, "fiberG": 9.0, "sodiumMg": 140.0},
            {"mealType": "lunch", "name": "Steamed Brown Rice, Dal Tadka & Spinach", "energyKcal": 680.0, "proteinG": 24.0, "carbohydrateG": 98.0, "fatG": 16.0, "fiberG": 14.0, "sodiumMg": 520.0},
            {"mealType": "dinner", "name": "Grilled Paneer Bhurji & Multigrain Rotis", "energyKcal": 560.0, "proteinG": 28.0, "carbohydrateG": 52.0, "fatG": 22.0, "fiberG": 8.0, "sodiumMg": 460.0},
            {"mealType": "morning_snack", "name": "Roasted Mixed Nuts & Apple Slices", "energyKcal": 220.0, "proteinG": 6.0, "carbohydrateG": 26.0, "fatG": 11.0, "fiberG": 5.0, "sodiumMg": 30.0}
        ],
        # Day -1
        [
            {"mealType": "breakfast", "name": "Poha with Roasted Peanuts & Green Tea", "energyKcal": 380.0, "proteinG": 11.0, "carbohydrateG": 58.0, "fatG": 12.0, "fiberG": 6.0, "sodiumMg": 320.0},
            {"mealType": "lunch", "name": "Curd Rice with Pomegranate & Moong Salad", "energyKcal": 610.0, "proteinG": 21.0, "carbohydrateG": 84.0, "fatG": 17.0, "fiberG": 10.0, "sodiumMg": 410.0},
            {"mealType": "dinner", "name": "Mixed Vegetable Khichdi with Roasted Papad", "energyKcal": 520.0, "proteinG": 19.0, "carbohydrateG": 78.0, "fatG": 14.0, "fiberG": 11.0, "sodiumMg": 490.0},
            {"mealType": "evening_snack", "name": "Boiled Chana Chaat with Lemon", "energyKcal": 240.0, "proteinG": 13.0, "carbohydrateG": 34.0, "fatG": 5.0, "fiberG": 8.0, "sodiumMg": 260.0}
        ],
        # Day -2
        [
            {"mealType": "breakfast", "name": "Sprouted Moong Dosa with Coconut Chutney", "energyKcal": 450.0, "proteinG": 18.0, "carbohydrateG": 60.0, "fatG": 15.0, "fiberG": 9.0, "sodiumMg": 380.0},
            {"mealType": "lunch", "name": "Tofu Soba Noodles with Broccoli & Sesame", "energyKcal": 640.0, "proteinG": 29.0, "carbohydrateG": 76.0, "fatG": 20.0, "fiberG": 8.0, "sodiumMg": 580.0},
            {"mealType": "dinner", "name": "Lentil Soup with Whole Wheat Pita & Hummus", "energyKcal": 490.0, "proteinG": 22.0, "carbohydrateG": 66.0, "fatG": 13.0, "fiberG": 12.0, "sodiumMg": 440.0}
        ],
        # Day -3
        [
            {"mealType": "breakfast", "name": "Greek Yogurt Parfait with Berries & Granola", "energyKcal": 390.0, "proteinG": 20.0, "carbohydrateG": 52.0, "fatG": 10.0, "fiberG": 7.0, "sodiumMg": 110.0},
            {"mealType": "lunch", "name": "Quinoa & Black Bean Burrito Bowl with Guacamole", "energyKcal": 710.0, "proteinG": 26.0, "carbohydrateG": 94.0, "fatG": 24.0, "fiberG": 16.0, "sodiumMg": 510.0},
            {"mealType": "dinner", "name": "Vegetable Dalia Khichdi with Raita", "energyKcal": 460.0, "proteinG": 17.0, "carbohydrateG": 72.0, "fatG": 11.0, "fiberG": 11.0, "sodiumMg": 390.0},
            {"mealType": "morning_snack", "name": "Banana & Pumpkin Seeds", "energyKcal": 190.0, "proteinG": 5.0, "carbohydrateG": 32.0, "fatG": 6.0, "fiberG": 4.0, "sodiumMg": 15.0}
        ],
        # Day -4
        [
            {"mealType": "breakfast", "name": "Idli Sambar with Tomato Coriander Dip", "energyKcal": 410.0, "proteinG": 14.0, "carbohydrateG": 74.0, "fatG": 7.0, "fiberG": 8.0, "sodiumMg": 420.0},
            {"mealType": "lunch", "name": "Soya Chunks Curry with Basmati Rice & Cucumber", "energyKcal": 660.0, "proteinG": 36.0, "carbohydrateG": 82.0, "fatG": 16.0, "fiberG": 11.0, "sodiumMg": 540.0},
            {"mealType": "dinner", "name": "Stir-fried Paneer & Veggie Wrap with Mint Sauce", "energyKcal": 510.0, "proteinG": 24.0, "carbohydrateG": 48.0, "fatG": 22.0, "fiberG": 7.0, "sodiumMg": 480.0}
        ],
        # Day -5
        [
            {"mealType": "breakfast", "name": "Besan Chilla with Mint Chutney & Spiced Tea", "energyKcal": 430.0, "proteinG": 17.0, "carbohydrateG": 55.0, "fatG": 15.0, "fiberG": 9.0, "sodiumMg": 370.0},
            {"mealType": "lunch", "name": "Rajma Chawal (Red Kidney Beans & Rice)", "energyKcal": 690.0, "proteinG": 26.0, "carbohydrateG": 102.0, "fatG": 14.0, "fiberG": 15.0, "sodiumMg": 560.0},
            {"mealType": "dinner", "name": "Warm Vegetable Soup & Sourdough Toast with Garlic Butter", "energyKcal": 480.0, "proteinG": 15.0, "carbohydrateG": 64.0, "fatG": 18.0, "fiberG": 8.0, "sodiumMg": 490.0},
            {"mealType": "evening_snack", "name": "Roasted Makhana (Foxnuts) with Turmeric", "energyKcal": 180.0, "proteinG": 5.0, "carbohydrateG": 28.0, "fatG": 5.0, "fiberG": 4.0, "sodiumMg": 160.0}
        ],
        # Day -6
        [
            {"mealType": "breakfast", "name": "Upma with Mixed Veggies & Filter Coffee", "energyKcal": 390.0, "proteinG": 10.0, "carbohydrateG": 64.0, "fatG": 11.0, "fiberG": 7.0, "sodiumMg": 360.0},
            {"mealType": "lunch", "name": "Chickpea Tikka Salad with Lemon Herb Dressing", "energyKcal": 630.0, "proteinG": 25.0, "carbohydrateG": 78.0, "fatG": 21.0, "fiberG": 13.0, "sodiumMg": 490.0},
            {"mealType": "dinner", "name": "Palak Paneer with Whole Wheat Chapati", "energyKcal": 540.0, "proteinG": 27.0, "carbohydrateG": 46.0, "fatG": 26.0, "fiberG": 9.0, "sodiumMg": 450.0}
        ]
    ]

    seeded_count = 0
    for day_offset, meals_for_day in enumerate(sample_day_templates):
        target_d = today - timedelta(days=day_offset)
        target_d_str = target_d.isoformat()

        # Delete any existing sample seeded meals for this day or seed if empty
        existing = await db.meals.count_documents({
            "userId": {"$in": [user_id, user_id_obj]},
            "$or": [{"date": target_d_str}, {"dateStr": target_d_str}]
        })
        if existing > 0:
            continue

        for m_data in meals_for_day:
            nutrients = {
                "energyKcal": m_data["energyKcal"],
                "proteinG": m_data["proteinG"],
                "carbohydrateG": m_data["carbohydrateG"],
                "fatG": m_data["fatG"],
                "fiberG": m_data["fiberG"],
                "sodiumMg": m_data["sodiumMg"]
            }
            consumed_dt = datetime.combine(target_d, time(12, 0)).replace(tzinfo=timezone.utc)
            item_snap = {
                "foodId": str(ObjectId()),
                "foodNameSnapshot": m_data["name"],
                "quantity": 1.0,
                "unit": "serving",
                "nutrientSnapshot": nutrients,
                "sourceVersion": "demo_seed"
            }
            meal_doc = {
                "userId": user_id_obj,
                "mealType": m_data["mealType"],
                "consumedAt": consumed_dt,
                "dateStr": target_d_str,
                "date": target_d_str,
                "items": [item_snap],
                "totalNutrients": nutrients,
                "mealTotals": nutrients,
                "notes": f"Sample intake: {m_data['name']}",
                "createdAt": now,
                "updatedAt": now
            }
            await db.meals.insert_one(meal_doc)
            seeded_count += 1

    return StandardResponse(
        success=True,
        data={"seededMealsCount": seeded_count, "daysCovered": 7},
        message=f"Successfully seeded {seeded_count} realistic sample meals across the past 7 days."
    )
