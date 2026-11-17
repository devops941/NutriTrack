from bson import ObjectId
from datetime import datetime, timezone, time
from typing import List, Dict, Any, Optional
from decimal import Decimal
from app.config.database import get_database
from app.modules.meals.schemas import MealItemInput, MealItemSnapshot
from app.engines.unit_converter import normalize_quantity, UnitConversionError
from app.engines.calculation_engine import calculate_per_100g, TRACKED_NUTRIENTS
from app.engines.aggregation_engine import aggregate_nutrients

async def build_meal_item_snapshots(items_input: List[MealItemInput]) -> List[Dict[str, Any]]:
    """
    Looks up each food in foods collection, normalizes quantity,
    computes deterministic nutrients, and constructs an immutable snapshot.
    """
    db = get_database()
    snapshots = []

    for item in items_input:
        if not ObjectId.is_valid(item.foodId):
            raise ValueError(f"Invalid food ID format: {item.foodId}")

        food = await db.foods.find_one({"_id": ObjectId(item.foodId)})
        if not food:
            raise ValueError(f"Food item not found with ID: {item.foodId}")

        basis = food.get("basis", {"amount": 100.0, "unit": "g"})
        servings = food.get("servings", [])

        # Normalize quantity with liquid density fallback enabled for practical meal logging
        norm_amount, norm_unit, _ = normalize_quantity(
            amount=item.quantity,
            unit=item.unit,
            food_servings=servings,
            target_basis=basis.get("unit", "g"),
            allow_liquid_fallback=True
        )

        # Calculate nutrient snapshot
        raw_nutrients = food.get("nutrients", {})
        calculated_nutrients = calculate_per_100g(
            nutrients=raw_nutrients,
            quantity_g=norm_amount,
            basis_amount=float(basis.get("amount", 100.0))
        )

        snapshot = {
            "foodId": str(food["_id"]),
            "foodNameSnapshot": food.get("name", "Unknown Food"),
            "quantity": float(item.quantity),
            "unit": item.unit,
            "nutrientSnapshot": calculated_nutrients,
            "sourceVersion": str(food.get("updatedAt", "v1"))
        }
        snapshots.append(snapshot)

    return snapshots

def calculate_meal_totals(snapshots: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
    """
    Calculates aggregated totals from the item-level snapshots.
    """
    nutrient_list = [s["nutrientSnapshot"] for s in snapshots if "nutrientSnapshot" in s]
    agg = aggregate_nutrients(nutrient_list)
    return agg["totals"]

def serialize_meal(doc: dict) -> dict:
    snapshots = doc.get("items", [])
    totals = calculate_meal_totals(snapshots)
    consumed_at = doc.get("consumedAt")
    if isinstance(consumed_at, datetime):
        date_str = consumed_at.strftime("%Y-%m-%d")
    else:
        date_str = str(consumed_at)[:10] if consumed_at else ""

    return {
        "id": str(doc["_id"]),
        "userId": str(doc["userId"]),
        "mealType": doc.get("mealType", "custom"),
        "consumedAt": consumed_at,
        "dateStr": date_str,
        "items": snapshots,
        "mealTotals": totals,
        "notes": doc.get("notes")
    }
