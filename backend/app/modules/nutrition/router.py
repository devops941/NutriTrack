from fastapi import APIRouter, HTTPException, status
from app.shared.schemas.response import StandardResponse
from app.modules.nutrition.schemas import (
    UnitConvertRequest,
    NutrientCalculateRequest,
    AggregateNutrientsRequest
)
from app.engines.unit_converter import normalize_quantity, UnitConversionError
from app.engines.calculation_engine import calculate_per_100g, assess_data_quality
from app.engines.aggregation_engine import aggregate_nutrients
from app.config.database import get_database
from bson import ObjectId
from decimal import Decimal

router = APIRouter(prefix="/nutrition", tags=["Nutrition Calculation & Conversion"])

@router.post("/convert", response_model=StandardResponse)
async def convert_quantity(payload: UnitConvertRequest):
    servings = None
    if payload.foodId and ObjectId.is_valid(payload.foodId):
        db = get_database()
        if db is not None:
            food = await db.foods.find_one({"_id": ObjectId(payload.foodId)})
            if food:
                servings = food.get("servings", [])

    try:
        norm_amount, norm_unit, method = normalize_quantity(
            amount=payload.amount,
            unit=payload.unit,
            food_servings=servings,
            target_basis=payload.targetBasis
        )
    except UnitConversionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StandardResponse(
        success=True,
        data={
            "originalQuantity": {"amount": payload.amount, "unit": payload.unit},
            "normalizedQuantity": {"amount": float(norm_amount), "unit": norm_unit},
            "conversionMethod": method
        },
        message="Quantity converted successfully"
    )

@router.post("/calculate", response_model=StandardResponse)
async def calculate_nutrition(payload: NutrientCalculateRequest):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable")

    if not ObjectId.is_valid(payload.foodId):
        raise HTTPException(status_code=400, detail="Invalid food ID format")

    food = await db.foods.find_one({"_id": ObjectId(payload.foodId)})
    if not food:
        raise HTTPException(status_code=404, detail="Food item not found in catalog")

    basis = food.get("basis", {"amount": 100.0, "unit": "g"})
    target_basis_unit = basis.get("unit", "g")
    servings = food.get("servings", [])

    try:
        norm_amount, norm_unit, conv_method = normalize_quantity(
            amount=payload.quantity,
            unit=payload.unit,
            food_servings=servings,
            target_basis=target_basis_unit
        )
    except UnitConversionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Calculate nutrients per 100g/basis
    raw_nutrients = food.get("nutrients", {})
    calculated = calculate_per_100g(
        nutrients=raw_nutrients,
        quantity_g=norm_amount,
        basis_amount=float(basis.get("amount", 100.0))
    )
    quality = assess_data_quality(calculated)

    return StandardResponse(
        success=True,
        data={
            "foodId": str(food["_id"]),
            "foodName": food.get("name"),
            "originalQuantity": {"amount": payload.quantity, "unit": payload.unit},
            "normalizedQuantity": {"amount": float(norm_amount), "unit": norm_unit},
            "nutrients": calculated,
            "dataQuality": quality,
            "calculationMethod": f"per_{basis.get('amount')}{target_basis_unit}_scaled ({conv_method})"
        },
        message="Nutrition calculation completed"
    )

@router.post("/aggregate", response_model=StandardResponse)
async def aggregate_nutrition_items(payload: AggregateNutrientsRequest):
    result = aggregate_nutrients(payload.nutrientSnapshots)
    return StandardResponse(
        success=True,
        data=result,
        message="Aggregated nutrients computed"
    )
