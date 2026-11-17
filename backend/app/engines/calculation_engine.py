from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional

TRACKED_NUTRIENTS = [
    "energyKcal",
    "proteinG",
    "carbohydrateG",
    "fatG",
    "fiberG",
    "sugarsG",
    "sodiumMg"
]

def calculate_per_100g(
    nutrients: Dict[str, Optional[float]],
    quantity_g: Decimal,
    basis_amount: float = 100.0
) -> Dict[str, Optional[float]]:
    """
    Scales nutrient values from defined basis (typically 100g or 100ml) to consumed quantity.
    
    Formula:
      Consumed = (Nutrient per basis * Quantity) / Basis
      
    Rules:
    - Retain None/null for missing values (never replace with zero).
    - Uses Decimal arithmetic with ROUND_HALF_UP to prevent floating-point drift.
    """
    if quantity_g < 0:
        raise ValueError("Quantity cannot be negative")

    dec_basis = Decimal(str(basis_amount))
    factor = quantity_g / dec_basis
    scaled_nutrients: Dict[str, Optional[float]] = {}

    for nut in TRACKED_NUTRIENTS:
        val = nutrients.get(nut)
        if val is None:
            scaled_nutrients[nut] = None
        else:
            dec_val = Decimal(str(val))
            # Exact multiplication, quantized to 2 decimal places
            scaled = (dec_val * factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            scaled_nutrients[nut] = float(scaled)

    return scaled_nutrients

def assess_data_quality(nutrients: Dict[str, Optional[float]]) -> Dict[str, Any]:
    """
    Evaluates known vs missing fields in the nutrient profile.
    """
    known_fields = [k for k, v in nutrients.items() if v is not None]
    missing_fields = [k for k, v in nutrients.items() if v is None]
    total_fields = len(TRACKED_NUTRIENTS)
    completeness_ratio = round(len(known_fields) / total_fields, 2) if total_fields > 0 else 0.0

    warnings = []
    if missing_fields:
        warnings.append(
            f"Missing {len(missing_fields)} nutrient field(s): {', '.join(missing_fields)}. Missing fields are preserved as unknown, not zero."
        )

    return {
        "knownNutrientsCount": len(known_fields),
        "missingNutrientsCount": len(missing_fields),
        "missingFields": missing_fields,
        "completenessRatio": completeness_ratio,
        "isComplete": len(missing_fields) == 0,
        "warnings": warnings
    }
