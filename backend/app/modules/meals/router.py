from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.shared.schemas.response import StandardResponse
from app.modules.meals.schemas import (
    MealCreate,
    MealUpdate,
    MealResponse,
    DailyMealsSummary,
    SaveMealTemplateRequest
)
from app.modules.meals.service import (
    build_meal_item_snapshots,
    calculate_meal_totals,
    serialize_meal
)
from app.core.dependencies import get_current_user
from app.config.database import get_database
from bson import ObjectId
from datetime import datetime, timezone, time
from typing import Optional

router = APIRouter(prefix="/meals", tags=["Meal Management & Food Diary"])

@router.post("", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def log_meal(payload: MealCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    now = datetime.now(timezone.utc)
    consumed_at = payload.consumedAt or now
    date_str = payload.dateStr or consumed_at.strftime("%Y-%m-%d")

    try:
        snapshots = await build_meal_item_snapshots(payload.items)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    meal_doc = {
        "userId": ObjectId(current_user["id"]),
        "mealType": payload.mealType.lower(),
        "consumedAt": consumed_at,
        "dateStr": date_str,
        "items": snapshots,
        "notes": payload.notes,
        "createdAt": now,
        "updatedAt": now
    }

    res = await db.meals.insert_one(meal_doc)
    meal_doc["_id"] = res.inserted_id

    return StandardResponse(
        success=True,
        data=serialize_meal(meal_doc),
        message="Meal logged successfully with immutable nutrient snapshots."
    )

@router.get("/daily", response_model=StandardResponse)
async def get_daily_diary(
    date: str = Query(..., description="Date string in YYYY-MM-DD format"),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")

    start_dt = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(target_date, time.max).replace(tzinfo=timezone.utc)

    # Query meals by userId and date range (or dateStr/date)
    user_id_val = current_user["id"]
    user_id_obj = ObjectId(user_id_val) if ObjectId.is_valid(user_id_val) else user_id_val
    cursor = db.meals.find({
        "userId": {"$in": [user_id_obj, str(user_id_val)]},
        "$or": [
            {"dateStr": date},
            {"date": date},
            {"consumedAt": {"$gte": start_dt, "$lte": end_dt}}
        ]
    }).sort("consumedAt", 1)

    meal_docs = await cursor.to_list(length=100)
    serialized_meals = [serialize_meal(m) for m in meal_docs]

    # Calculate overall daily totals
    all_item_snapshots = []
    total_items = 0
    for m in serialized_meals:
        all_item_snapshots.extend(m["items"])
        total_items += len(m["items"])

    daily_totals = calculate_meal_totals(all_item_snapshots)

    summary_data = {
        "date": date,
        "meals": serialized_meals,
        "dailyTotals": daily_totals,
        "mealsCount": len(serialized_meals),
        "itemsCount": total_items
    }

    return StandardResponse(
        success=True,
        data=summary_data,
        message=f"Retrieved food diary for {date} ({len(serialized_meals)} meals, {total_items} items)"
    )

@router.get("/{meal_id}", response_model=StandardResponse)
async def get_meal_by_id(meal_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(meal_id):
        raise HTTPException(status_code=400, detail="Invalid meal ID format")

    db = get_database()
    meal = await db.meals.find_one({
        "_id": ObjectId(meal_id),
        "userId": ObjectId(current_user["id"])
    })
    if not meal:
        raise HTTPException(status_code=404, detail="Meal record not found or access denied")

    return StandardResponse(
        success=True,
        data=serialize_meal(meal),
        message="Meal details retrieved"
    )

@router.patch("/{meal_id}", response_model=StandardResponse)
async def update_meal(
    meal_id: str,
    payload: MealUpdate,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(meal_id):
        raise HTTPException(status_code=400, detail="Invalid meal ID format")

    db = get_database()
    meal = await db.meals.find_one({
        "_id": ObjectId(meal_id),
        "userId": ObjectId(current_user["id"])
    })
    if not meal:
        raise HTTPException(status_code=404, detail="Meal record not found or access denied")

    now = datetime.now(timezone.utc)
    update_data: dict = {"updatedAt": now}

    if payload.mealType:
        update_data["mealType"] = payload.mealType.lower()

    if payload.consumedAt:
        update_data["consumedAt"] = payload.consumedAt
        update_data["dateStr"] = payload.consumedAt.strftime("%Y-%m-%d")

    if payload.notes is not None:
        update_data["notes"] = payload.notes

    if payload.items is not None:
        try:
            new_snapshots = await build_meal_item_snapshots(payload.items)
            update_data["items"] = new_snapshots
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    updated_meal = await db.meals.find_one_and_update(
        {"_id": ObjectId(meal_id)},
        {"$set": update_data},
        return_document=True
    )

    return StandardResponse(
        success=True,
        data=serialize_meal(updated_meal),
        message="Meal updated and snapshots recalculated"
    )

@router.delete("/{meal_id}", response_model=StandardResponse)
async def delete_meal(meal_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(meal_id):
        raise HTTPException(status_code=400, detail="Invalid meal ID format")

    db = get_database()
    result = await db.meals.delete_one({
        "_id": ObjectId(meal_id),
        "userId": ObjectId(current_user["id"])
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meal record not found or already deleted")

    return StandardResponse(
        success=True,
        data={"deletedMealId": meal_id},
        message="Meal record deleted from diary"
    )

@router.post("/templates", response_model=StandardResponse)
async def save_meal_template(
    payload: SaveMealTemplateRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    now = datetime.now(timezone.utc)

    try:
        snapshots = await build_meal_item_snapshots(payload.items)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    template_doc = {
        "userId": ObjectId(current_user["id"]),
        "name": payload.name.strip(),
        "mealType": payload.mealType.lower(),
        "items": [item.model_dump() for item in payload.items],
        "itemSnapshots": snapshots,
        "createdAt": now
    }

    res = await db.saved_meals.insert_one(template_doc)
    return StandardResponse(
        success=True,
        data={"templateId": str(res.inserted_id), "name": payload.name},
        message="Meal template saved successfully"
    )

@router.get("/templates/all", response_model=StandardResponse)
async def list_meal_templates(current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db.saved_meals.find({"userId": ObjectId(current_user["id"])}).sort("name", 1)
    templates = await cursor.to_list(length=50)

    formatted = [
        {
            "id": str(t["_id"]),
            "name": t.get("name"),
            "mealType": t.get("mealType"),
            "items": t.get("items", []),
            "itemSnapshots": t.get("itemSnapshots", [])
        } for t in templates
    ]

    return StandardResponse(
        success=True,
        data=formatted,
        message=f"Retrieved {len(formatted)} saved meal templates"
    )
