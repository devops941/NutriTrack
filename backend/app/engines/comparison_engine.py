from typing import List, Dict, Any, Optional

TRACKED_NUTRIENTS = [
    "energyKcal",
    "proteinG",
    "carbohydrateG",
    "fatG",
    "saturatedFatG",
    "fiberG",
    "sugarsG",
    "sodiumMg",
    "calciumMg",
    "ironMg",
    "vitaminCMg"
]

def normalize_food_nutrients(food: Dict[str, Any], basis: str = "per_100g") -> Dict[str, Optional[float]]:
    """
    Normalizes a food's nutrients according to the selected basis.
    Standard database nutrients are stored per 100g/100ml.
    """
    raw_nutrients = food.get("nutrients", {})
    if basis == "serving":
        serving_size = food.get("servingSize")
        if serving_size and float(serving_size) > 0:
            scale = float(serving_size) / 100.0
            normalized = {}
            for k in TRACKED_NUTRIENTS:
                val = raw_nutrients.get(k)
                normalized[k] = round(float(val) * scale, 2) if val is not None else None
            return normalized

    # Default: per 100g / per 100ml
    normalized = {}
    for k in TRACKED_NUTRIENTS:
        val = raw_nutrients.get(k)
        normalized[k] = round(float(val), 2) if val is not None else None
    return normalized

def calculate_completeness(nutrients: Dict[str, Optional[float]]) -> float:
    present_count = sum(1 for k in TRACKED_NUTRIENTS if nutrients.get(k) is not None)
    return round((present_count / len(TRACKED_NUTRIENTS)) * 100.0, 1)

def compare_food_products(foods: List[Dict[str, Any]], basis: str = "per_100g") -> Dict[str, Any]:
    """
    Compares 2-4 food items side by side.
    Computes comparative matrix, deltas vs baseline (first product),
    and highlights missing data without treating missing values as zero.
    """
    if len(foods) < 2:
        raise ValueError("At least 2 foods are required for comparison.")

    compared_products = []
    matrix: Dict[str, List[Optional[float]]] = {k: [] for k in TRACKED_NUTRIENTS}
    missing_fields_by_product: Dict[str, List[str]] = {}

    for food in foods:
        food_id = str(food.get("_id") or food.get("id"))
        food_name = food.get("name", "Unknown Food")
        norm_nutrients = normalize_food_nutrients(food, basis=basis)
        score = calculate_completeness(norm_nutrients)

        missing = [k for k in TRACKED_NUTRIENTS if norm_nutrients.get(k) is None]
        missing_fields_by_product[food_id] = missing

        compared_products.append({
            "id": food_id,
            "name": food_name,
            "brand": food.get("brand"),
            "category": food.get("category"),
            "servingSize": food.get("servingSize"),
            "servingUnit": food.get("servingUnit", "g"),
            "nutrients": norm_nutrients,
            "completenessScore": score
        })

        for k in TRACKED_NUTRIENTS:
            matrix[k].append(norm_nutrients.get(k))

    # Deltas calculation vs baseline (Product 0)
    deltas_vs_first: Dict[str, List[Optional[float]]] = {}
    base_product = compared_products[0]
    base_nutrients = base_product["nutrients"]

    for k in TRACKED_NUTRIENTS:
        base_val = base_nutrients.get(k)
        nutrient_deltas: List[Optional[float]] = []

        for p in compared_products[1:]:
            comp_val = p["nutrients"].get(k)
            if base_val is not None and comp_val is not None:
                diff = round(comp_val - base_val, 2)
                nutrient_deltas.append(diff)
            else:
                # Crucial requirement: flag missing data instead of calculating 0 diff
                nutrient_deltas.append(None)

        deltas_vs_first[k] = nutrient_deltas

    return {
        "normalizeBasis": basis,
        "products": compared_products,
        "trackedNutrients": TRACKED_NUTRIENTS,
        "matrix": matrix,
        "deltasVsFirst": deltas_vs_first,
        "missingFieldsByProduct": missing_fields_by_product
    }
