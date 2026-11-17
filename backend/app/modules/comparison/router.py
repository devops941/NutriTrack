from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from bson import ObjectId
from datetime import datetime, timezone

from app.config.database import get_database
from app.core.dependencies import get_current_user
from app.modules.comparison.schemas import ComparisonRequest, ProductComparisonResult
from app.engines.comparison_engine import compare_food_products
from app.shared.schemas.response import ApiResponse

router = APIRouter(prefix="/comparison", tags=["Food Comparison"])

@router.post("", response_model=ApiResponse[ProductComparisonResult])
async def compare_foods(
    request: ComparisonRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Compare 2 to 4 food products side-by-side with normalization and delta analysis.
    Highlights missing data rather than assuming zero.
    """
    if len(request.foodIds) < 2 or len(request.foodIds) > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comparison requires between 2 and 4 food products."
        )

    valid_oids = []
    for fid in request.foodIds:
        if not ObjectId.is_valid(fid):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Food ID: {fid}"
            )
        valid_oids.append(ObjectId(fid))

    cursor = db.foods.find({"_id": {"$in": valid_oids}})
    found_foods = []
    async for f in cursor:
        found_foods.append(f)

    if len(found_foods) < 2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Found only {len(found_foods)} of requested foods. At least 2 existing foods are required."
        )

    # Sort found_foods in the order requested by user
    id_map = {str(f["_id"]): f for f in found_foods}
    ordered_foods = [id_map[fid] for fid in request.foodIds if fid in id_map]

    result = compare_food_products(ordered_foods, basis=request.normalizeBasis)

    # Optionally log comparison history
    try:
        user_id = str(current_user.get("_id") or current_user.get("id"))
        await db.comparison_history.insert_one({
            "userId": user_id,
            "foodIds": request.foodIds,
            "normalizeBasis": request.normalizeBasis,
            "comparedAt": datetime.now(timezone.utc).isoformat()
        })
    except Exception:
        pass

    comparison_data = ProductComparisonResult.model_validate(result)

    return ApiResponse(
        success=True,
        data=comparison_data,
        message=f"Successfully compared {len(ordered_foods)} food products on basis '{request.normalizeBasis}'"
    )
