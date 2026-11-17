from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, time
from bson import ObjectId

from app.config.database import get_database
from app.core.dependencies import get_current_user
from app.modules.targets.schemas import (
    ReferenceSetResponse,
    UserTargetUpdate,
    UserTargetResponse,
    DailyTargetProgressResponse,
    NutrientProgressItem
)
from app.shared.schemas.response import ApiResponse

router = APIRouter(prefix="/targets", tags=["Nutrition Targets"])

LEGAL_DISCLAIMER = (
    "Dietary reference targets and progress indicators are provided solely for personal tracking "
    "and nutritional awareness. They do not constitute medical advice or nutritional prescriptions. "
    "Individuals with clinical conditions, pregnancy, or specific metabolic needs should consult "
    "a qualified medical practitioner or registered dietitian."
)

LIMIT_NUTRIENTS = {"sodiumMg", "sugarsG", "saturatedFatG"}

NUTRIENT_ALIASES: Dict[str, List[str]] = {
    "energyKcal": ["energyKcal", "calories", "energy", "energy_kcal"],
    "proteinG": ["proteinG", "protein", "protein_g"],
    "carbohydrateG": ["carbohydrateG", "carbohydrates", "carbs", "carbohydrate_g"],
    "fatG": ["fatG", "fat", "totalFat", "fat_g"],
    "fiberG": ["fiberG", "fiber", "dietaryFiber", "fiber_g"],
    "sodiumMg": ["sodiumMg", "sodium", "sodium_mg"],
    "sugarsG": ["sugarsG", "sugars", "sugar", "sugars_g"],
    "saturatedFatG": ["saturatedFatG", "saturatedFat", "saturated_fat_g"],
    "calciumMg": ["calciumMg", "calcium", "calcium_mg"],
    "ironMg": ["ironMg", "iron", "iron_mg"],
    "vitaminCMg": ["vitaminCMg", "vitaminC", "vitamin_c", "vitamin_c_mg"]
}

def extract_meal_nutrients_sum(meal: dict) -> Dict[str, float]:
    """
    Extracts total nutrients from a meal document.
    Checks mealTotals, totalNutrients, and item-level nutrientSnapshots.
    Maps alias keys to canonical target keys.
    """
    totals: Dict[str, float] = {}

    def add_from_dict(d: dict):
        if not isinstance(d, dict):
            return
        for target_key, aliases in NUTRIENT_ALIASES.items():
            for alias in aliases:
                val = d.get(alias)
                if val is not None:
                    try:
                        totals[target_key] = totals.get(target_key, 0.0) + float(val)
                        break
                    except (ValueError, TypeError):
                        pass

    top_totals = meal.get("totalNutrients") or meal.get("mealTotals")
    if top_totals and isinstance(top_totals, dict) and len(top_totals) > 0:
        add_from_dict(top_totals)
    elif "items" in meal and isinstance(meal["items"], list):
        for item in meal["items"]:
            if isinstance(item, dict):
                snap = item.get("nutrientSnapshot") or item.get("nutrients")
                if snap and isinstance(snap, dict):
                    add_from_dict(snap)

    return totals

@router.get("/reference-sets", response_model=ApiResponse[List[ReferenceSetResponse]])
async def list_reference_sets(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    List authoritative nutritional reference sets (ICMR-NIN, WHO).
    """
    cursor = db.reference_sets.find({})
    items = []
    async for doc in cursor:
        items.append(ReferenceSetResponse(
            id=str(doc["_id"]),
            code=doc["code"],
            name=doc["name"],
            jurisdiction=doc.get("jurisdiction", "India"),
            population=doc.get("population", "Adult"),
            source=doc.get("source", ""),
            targets=doc.get("targets", {}),
            description=doc.get("description")
        ))
    return ApiResponse(success=True, data=items, message=f"Loaded {len(items)} reference sets")

@router.get("/me", response_model=ApiResponse[UserTargetResponse])
async def get_user_targets(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Get user's configured dietary targets (defaults to ICMR Adult Male Sedentary if unset).
    """
    user_id_val = current_user.get("id") or current_user.get("_id")
    user_id_str = str(user_id_val)
    user_id_obj = ObjectId(user_id_str) if ObjectId.is_valid(user_id_str) else None
    user_ids = [user_id_str]
    if user_id_obj:
        user_ids.append(user_id_obj)

    target_doc = await db.user_targets.find_one({"userId": {"$in": user_ids}})

    # Default to ICMR Sedentary Adult Male if not configured
    default_ref_code = "ICMR_ADULT_SEDENTARY_MALE"
    ref_set = await db.reference_sets.find_one({"code": default_ref_code})
    default_targets = ref_set.get("targets", {}) if ref_set else {
        "energyKcal": 2110.0,
        "proteinG": 54.0,
        "carbohydrateG": 260.0,
        "fatG": 30.0,
        "fiberG": 30.0,
        "sodiumMg": 2000.0
    }

    if not target_doc:
        return ApiResponse(
            success=True,
            data=UserTargetResponse(
                userId=user_id_str,
                referenceSetCode=default_ref_code,
                effectiveTargets=default_targets,
                customTargets=None,
                updatedAt=None
            ),
            message="Active targets loaded (default reference set)"
        )

    ref_code = target_doc.get("referenceSetCode", default_ref_code)
    active_ref = await db.reference_sets.find_one({"code": ref_code})
    base_targets = active_ref.get("targets", {}) if active_ref else default_targets

    # Apply custom target overrides if any
    custom_targets = target_doc.get("customTargets") or {}
    effective = dict(base_targets)
    effective.update(custom_targets)

    return ApiResponse(
        success=True,
        data=UserTargetResponse(
            userId=user_id_str,
            referenceSetCode=ref_code,
            effectiveTargets=effective,
            customTargets=custom_targets if custom_targets else None,
            updatedAt=target_doc.get("updatedAt")
        ),
        message="Active targets loaded"
    )

@router.put("/me", response_model=ApiResponse[UserTargetResponse])
async def update_user_targets(
    body: UserTargetUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Update user's active reference set or custom nutrient targets.
    """
    user_id_val = current_user.get("id") or current_user.get("_id")
    user_id_str = str(user_id_val)
    user_id_obj = ObjectId(user_id_str) if ObjectId.is_valid(user_id_str) else None
    user_ids = [user_id_str]
    if user_id_obj:
        user_ids.append(user_id_obj)

    ref_code = body.referenceSetCode or "ICMR_ADULT_SEDENTARY_MALE"

    ref_set = await db.reference_sets.find_one({"code": ref_code})
    if not ref_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reference set '{ref_code}' does not exist."
        )

    base_targets = ref_set.get("targets", {})
    custom = body.customTargets or {}

    effective = dict(base_targets)
    effective.update(custom)

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.user_targets.update_one(
        {"userId": {"$in": user_ids}},
        {
            "$set": {
                "userId": user_id_str,
                "referenceSetCode": ref_code,
                "customTargets": custom if custom else None,
                "effectiveTargets": effective,
                "updatedAt": now_iso
            }
        },
        upsert=True
    )

    return ApiResponse(
        success=True,
        data=UserTargetResponse(
            userId=user_id_str,
            referenceSetCode=ref_code,
            effectiveTargets=effective,
            customTargets=custom if custom else None,
            updatedAt=now_iso
        ),
        message="Nutrition targets updated successfully"
    )

@router.get("/progress", response_model=ApiResponse[DailyTargetProgressResponse])
async def get_daily_target_progress(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (defaults to today)"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Computes daily consumption progress against active targets for a specific date.
    Calculates consumed, target, remaining, and percentage with status and legal disclaimer.
    """
    user_id_val = current_user.get("id") or current_user.get("_id")
    user_id_str = str(user_id_val)
    user_id_obj = ObjectId(user_id_str) if ObjectId.is_valid(user_id_str) else None
    user_ids = [user_id_str]
    if user_id_obj:
        user_ids.append(user_id_obj)

    query_date = date or datetime.now().strftime("%Y-%m-%d")

    # Fetch user's active targets
    target_doc = await db.user_targets.find_one({"userId": {"$in": user_ids}})
    ref_code = target_doc.get("referenceSetCode", "ICMR_ADULT_SEDENTARY_MALE") if target_doc else "ICMR_ADULT_SEDENTARY_MALE"
    ref_set = await db.reference_sets.find_one({"code": ref_code})
    ref_name = ref_set.get("name", "ICMR-NIN 2020 RDA") if ref_set else "ICMR-NIN RDA"

    base_targets = ref_set.get("targets", {}) if ref_set else {
        "energyKcal": 2110.0,
        "proteinG": 54.0,
        "carbohydrateG": 260.0,
        "fatG": 30.0,
        "fiberG": 30.0,
        "sodiumMg": 2000.0
    }
    effective_targets = dict(base_targets)
    if target_doc and target_doc.get("customTargets"):
        effective_targets.update(target_doc["customTargets"])

    # Query all meals for user on query_date
    try:
        target_date = datetime.strptime(query_date, "%Y-%m-%d").date()
        start_dt = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(target_date, time.max).replace(tzinfo=timezone.utc)
    except ValueError:
        start_dt = None
        end_dt = None

    date_conditions: List[Dict[str, Any]] = [
        {"dateStr": query_date},
        {"date": query_date}
    ]
    if start_dt and end_dt:
        date_conditions.append({"consumedAt": {"$gte": start_dt, "$lte": end_dt}})

    cursor = db.meals.find({
        "userId": {"$in": user_ids},
        "$or": date_conditions
    })

    consumed_totals: Dict[str, float] = {}
    async for meal in cursor:
        meal_sum = extract_meal_nutrients_sum(meal)
        for nut, val in meal_sum.items():
            consumed_totals[nut] = round(consumed_totals.get(nut, 0.0) + float(val), 2)

    # Compute progress for each targeted nutrient
    items: List[NutrientProgressItem] = []
    tracked_count = 0
    logged_count = 0

    for nut, target_val in effective_targets.items():
        if target_val <= 0:
            continue
        tracked_count += 1
        consumed = consumed_totals.get(nut, 0.0)
        if nut in consumed_totals and consumed > 0:
            logged_count += 1

        is_limit = nut in LIMIT_NUTRIENTS
        pct = round((consumed / target_val) * 100.0, 1)
        remaining = round(max(0.0, target_val - consumed), 2)

        # Determine status
        if is_limit:
            if pct <= 80.0:
                status_str = "on_track"
            elif pct <= 100.0:
                status_str = "approaching"
            else:
                status_str = "exceeded"
        else:
            if pct < 70.0:
                status_str = "under"
            elif pct <= 110.0:
                status_str = "on_track"
            else:
                status_str = "exceeded"

        items.append(NutrientProgressItem(
            nutrient=nut,
            consumed=round(consumed, 2),
            target=round(target_val, 2),
            remaining=remaining,
            progressPercentage=pct,
            status=status_str,
            isLimit=is_limit
        ))

    completeness_pct = round((logged_count / tracked_count) * 100.0, 1) if tracked_count > 0 else 0.0

    return ApiResponse(
        success=True,
        data=DailyTargetProgressResponse(
            date=query_date,
            referenceSource=ref_name,
            disclaimer=LEGAL_DISCLAIMER,
            overallCompletenessPercent=completeness_pct,
            items=items
        ),
        message=f"Progress calculated for {query_date}"
    )

