from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta, time
from bson import ObjectId

from app.config.database import get_database
from app.core.dependencies import get_current_user
from app.modules.meal_plans.schemas import (
    MealPlanRequest,
    MealPlanResponse,
    PlannedVsActualResponse,
    NutrientVarianceItem,
    PlannedMeal,
    LogPlannedMealToDiaryRequest
)
from app.shared.schemas.response import StandardResponse

router = APIRouter(prefix="/meal-plans", tags=["Smart Meal Planner"])

TRACKED_PLAN_NUTRIENTS = [
    "energyKcal",
    "proteinG",
    "carbohydrateG",
    "fatG",
    "fiberG",
    "sodiumMg"
]

def calculate_plan_totals(meals: List[PlannedMeal]) -> Dict[str, float]:
    daily_totals: Dict[str, float] = {k: 0.0 for k in TRACKED_PLAN_NUTRIENTS}
    for m in meals:
        # compute meal total if items present
        meal_nutrients: Dict[str, float] = {k: 0.0 for k in TRACKED_PLAN_NUTRIENTS}
        for item in m.items:
            for k in TRACKED_PLAN_NUTRIENTS:
                val = item.nutrients.get(k)
                if val is not None:
                    meal_nutrients[k] = round(meal_nutrients[k] + float(val), 2)
        
        # update meal object totals if empty
        if not m.totalNutrients:
            m.totalNutrients = meal_nutrients
            
        for k in TRACKED_PLAN_NUTRIENTS:
            daily_totals[k] = round(daily_totals[k] + float(m.totalNutrients.get(k, 0.0)), 2)
            
    return daily_totals

@router.post("", response_model=StandardResponse[MealPlanResponse])
async def save_meal_plan(
    body: MealPlanRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Create or update a meal plan for a specific date.
    Calculates prospective planned nutrient totals.
    """
    user_id = str(current_user["_id"])
    planned_totals = calculate_plan_totals(body.meals)
    now_iso = datetime.now(timezone.utc).isoformat()

    doc_data = {
        "userId": user_id,
        "date": body.date,
        "title": body.title or f"Plan for {body.date}",
        "notes": body.notes,
        "meals": [m.model_dump() for m in body.meals],
        "plannedDailyTotals": planned_totals,
        "updatedAt": now_iso
    }

    # Upsert by userId and date
    existing = await db.meal_plans.find_one({"userId": user_id, "date": body.date})
    if existing:
        await db.meal_plans.update_one(
            {"_id": existing["_id"]},
            {"$set": doc_data}
        )
        plan_id = str(existing["_id"])
        created_at = existing.get("createdAt", now_iso)
    else:
        doc_data["createdAt"] = now_iso
        res = await db.meal_plans.insert_one(doc_data)
        plan_id = str(res.inserted_id)
        created_at = now_iso

    return StandardResponse(
        success=True,
        data=MealPlanResponse(
            id=plan_id,
            userId=user_id,
            date=body.date,
            title=doc_data["title"],
            notes=body.notes,
            meals=body.meals,
            plannedDailyTotals=planned_totals,
            createdAt=created_at,
            updatedAt=now_iso
        ),
        message=f"Meal plan for {body.date} saved successfully"
    )

@router.get("", response_model=StandardResponse[List[MealPlanResponse]])
async def get_meal_plans(
    startDate: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    endDate: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Retrieve meal plans across a date range (defaults to current week).
    """
    user_id = str(current_user["_id"])
    today = datetime.now().date()
    
    if not startDate or not endDate:
        # Default to current 7-day week
        start_dt = today - timedelta(days=today.weekday())
        end_dt = start_dt + timedelta(days=6)
        s_str = start_dt.isoformat()
        e_str = end_dt.isoformat()
    else:
        s_str = startDate
        e_str = endDate

    cursor = db.meal_plans.find({
        "userId": user_id,
        "date": {"$gte": s_str, "$lte": e_str}
    }).sort("date", 1)

    plans = []
    async for doc in cursor:
        plans.append(MealPlanResponse(
            id=str(doc["_id"]),
            userId=doc["userId"],
            date=doc["date"],
            title=doc.get("title"),
            notes=doc.get("notes"),
            meals=[PlannedMeal(**m) for m in doc.get("meals", [])],
            plannedDailyTotals=doc.get("plannedDailyTotals", {}),
            createdAt=doc.get("createdAt", ""),
            updatedAt=doc.get("updatedAt", "")
        ))

    return StandardResponse(
        success=True,
        data=plans,
        message=f"Retrieved {len(plans)} meal plans for {s_str} to {e_str}"
    )

@router.get("/day", response_model=StandardResponse[Optional[MealPlanResponse]])
async def get_meal_plan_for_day(
    date: str = Query(..., description="Date YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Retrieve a specific day's meal plan.
    """
    user_id = str(current_user["_id"])
    doc = await db.meal_plans.find_one({"userId": user_id, "date": date})
    if not doc:
        return StandardResponse(
            success=True,
            data=None,
            message=f"No meal plan found for {date}"
        )

    return StandardResponse(
        success=True,
        data=MealPlanResponse(
            id=str(doc["_id"]),
            userId=doc["userId"],
            date=doc["date"],
            title=doc.get("title"),
            notes=doc.get("notes"),
            meals=[PlannedMeal(**m) for m in doc.get("meals", [])],
            plannedDailyTotals=doc.get("plannedDailyTotals", {}),
            createdAt=doc.get("createdAt", ""),
            updatedAt=doc.get("updatedAt", "")
        ),
        message=f"Meal plan for {date} retrieved"
    )

@router.delete("/{id}", response_model=StandardResponse[Dict[str, Any]])
async def delete_meal_plan(
    id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Delete a meal plan by ID.
    """
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid plan ID.")

    user_id = str(current_user["_id"])
    res = await db.meal_plans.delete_one({"_id": ObjectId(id), "userId": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meal plan not found or not owned by user.")

    return StandardResponse(success=True, data={"deletedId": id}, message="Meal plan deleted successfully")

@router.post("/log-to-diary", response_model=StandardResponse[Dict[str, Any]])
async def log_planned_meal_to_diary(
    body: LogPlannedMealToDiaryRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Directly logs a planned meal into the user's Food Diary (db.meals) for a specific date,
    creating immutable nutrient snapshots.
    """
    user_id = str(current_user["_id"])
    user_id_obj = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    try:
        target_date = datetime.strptime(body.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")

    now = datetime.now(timezone.utc)
    if target_date == now.date():
        consumed_at = now
    else:
        consumed_at = datetime.combine(target_date, time(12, 0)).replace(tzinfo=timezone.utc)

    # Build immutable item snapshots
    item_snapshots = []
    calc_totals: Dict[str, float] = {k: 0.0 for k in TRACKED_PLAN_NUTRIENTS}

    for item in body.items:
        nutrient_snap = {}
        for k in TRACKED_PLAN_NUTRIENTS:
            v = item.nutrients.get(k)
            nutrient_snap[k] = round(float(v), 2) if v is not None else 0.0
            calc_totals[k] = round(calc_totals[k] + nutrient_snap[k], 2)

        snapshot = {
            "foodId": item.foodId or str(ObjectId()),
            "foodNameSnapshot": item.name,
            "quantity": float(item.portionGrams),
            "unit": "g",
            "nutrientSnapshot": nutrient_snap,
            "sourceVersion": "planned_meal"
        }
        item_snapshots.append(snapshot)

    # If body.totalNutrients provided and items had no nutrients or empty
    if body.totalNutrients:
        for k in TRACKED_PLAN_NUTRIENTS:
            if calc_totals[k] == 0.0 and body.totalNutrients.get(k):
                calc_totals[k] = round(float(body.totalNutrients[k]), 2)

    # If items was empty, create a synthetic item snapshot
    if not item_snapshots:
        item_snapshots.append({
            "foodId": str(ObjectId()),
            "foodNameSnapshot": body.name or body.mealType.capitalize(),
            "quantity": 100.0,
            "unit": "serving",
            "nutrientSnapshot": {k: calc_totals[k] for k in TRACKED_PLAN_NUTRIENTS},
            "sourceVersion": "planned_meal"
        })

    meal_doc = {
        "userId": user_id_obj,
        "mealType": body.mealType.lower(),
        "consumedAt": consumed_at,
        "dateStr": body.date,
        "date": body.date,
        "items": item_snapshots,
        "totalNutrients": calc_totals,
        "mealTotals": calc_totals,
        "notes": f"Logged from planned meal: {body.name or body.mealType.capitalize()}",
        "createdAt": now,
        "updatedAt": now
    }

    res = await db.meals.insert_one(meal_doc)

    response_data = {
        "id": str(res.inserted_id),
        "userId": user_id,
        "mealType": body.mealType.lower(),
        "dateStr": body.date,
        "consumedAt": consumed_at.isoformat(),
        "items": item_snapshots,
        "totalNutrients": calc_totals,
        "mealTotals": calc_totals,
        "notes": meal_doc["notes"]
    }

    return StandardResponse(
        success=True,
        data=response_data,
        message=f"Planned meal '{body.name or body.mealType}' logged to food diary successfully"
    )

@router.get("/variance", response_model=StandardResponse[PlannedVsActualResponse])
async def get_planned_vs_actual_variance(
    date: str = Query(..., description="Date YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Compares planned meals vs actually consumed meals logged on the food diary for a specific date.
    Calculates variance deltas and adherence status.
    """
    user_id = str(current_user["_id"])
    user_id_obj = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    # 1. Fetch Planned Meals
    plan_doc = await db.meal_plans.find_one({
        "userId": {"$in": [user_id, str(user_id_obj), user_id_obj]},
        "date": date
    })
    if not plan_doc:
        plan_doc = await db.meal_plans.find_one({"userId": user_id, "date": date})

    planned_totals = plan_doc.get("plannedDailyTotals", {}) if plan_doc else {}
    planned_meal_count = len(plan_doc.get("meals", [])) if plan_doc else 0

    # 2. Fetch Actual Logged Meals from food diary
    actual_cursor = db.meals.find({
        "userId": {"$in": [user_id, str(user_id_obj), user_id_obj]},
        "$or": [
            {"dateStr": date},
            {"date": date}
        ]
    })
    actual_totals: Dict[str, float] = {k: 0.0 for k in TRACKED_PLAN_NUTRIENTS}
    actual_meal_count = 0

    async for meal in actual_cursor:
        actual_meal_count += 1
        items = meal.get("items", [])
        meal_nutrients: Dict[str, float] = {k: 0.0 for k in TRACKED_PLAN_NUTRIENTS}
        found_item_nutrients = False

        for item in items:
            snapshot = item.get("nutrientSnapshot") or item.get("nutrients") or {}
            for k in TRACKED_PLAN_NUTRIENTS:
                val = snapshot.get(k)
                if val is not None:
                    meal_nutrients[k] = round(meal_nutrients[k] + float(val), 2)
                    found_item_nutrients = True

        if not found_item_nutrients:
            t = meal.get("totalNutrients") or meal.get("mealTotals") or {}
            for k in TRACKED_PLAN_NUTRIENTS:
                v = t.get(k)
                if v is not None:
                    meal_nutrients[k] = round(meal_nutrients[k] + float(v), 2)

        for k in TRACKED_PLAN_NUTRIENTS:
            actual_totals[k] = round(actual_totals[k] + meal_nutrients[k], 2)

    # 3. Compute Variances
    items: List[NutrientVarianceItem] = []
    for k in TRACKED_PLAN_NUTRIENTS:
        plan_val = planned_totals.get(k, 0.0)
        act_val = actual_totals.get(k, 0.0)
        variance = round(act_val - plan_val, 2)

        if plan_val > 0:
            var_pct = round((variance / plan_val) * 100.0, 1)
        else:
            var_pct = 0.0

        if abs(var_pct) <= 10.0:
            status_str = "on_target"
        elif variance > 0:
            status_str = "over_plan"
        else:
            status_str = "under_plan"

        items.append(NutrientVarianceItem(
            nutrient=k,
            planned=round(plan_val, 2),
            actual=round(act_val, 2),
            variance=variance,
            variancePercentage=var_pct,
            status=status_str
        ))

    # Observation
    if plan_doc and actual_meal_count > 0:
        obs = f"Found {planned_meal_count} planned meals and {actual_meal_count} logged diary meals for {date}."
    elif plan_doc and actual_meal_count == 0:
        obs = f"Meal plan exists with {planned_meal_count} meals, but no actual food diary meals have been logged yet for {date}."
    elif not plan_doc and actual_meal_count > 0:
        obs = f"{actual_meal_count} meals logged in food diary for {date}, but no prospective meal plan was configured."
    else:
        obs = f"Neither a meal plan nor food diary entries exist for {date}."

    return StandardResponse(
        success=True,
        data=PlannedVsActualResponse(
            date=date,
            hasPlannedMeal=plan_doc is not None,
            hasActualMeals=actual_meal_count > 0,
            plannedMealCount=planned_meal_count,
            actualMealCount=actual_meal_count,
            items=items,
            observation=obs
        ),
        message=f"Planned vs actual variance computed for {date}"
    )
