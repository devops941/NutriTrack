from decimal import Decimal
from typing import Tuple, List, Optional, Dict, Any

MASS_CONVERSIONS: Dict[str, Decimal] = {
    "kg": Decimal("1000.0"),
    "g": Decimal("1.0"),
    "mg": Decimal("0.001"),
    "gram": Decimal("1.0"),
    "grams": Decimal("1.0"),
    "kilogram": Decimal("1000.0"),
    "kilograms": Decimal("1000.0"),
    "milligram": Decimal("0.001"),
    "milligrams": Decimal("0.001"),
}

VOLUME_CONVERSIONS: Dict[str, Decimal] = {
    "l": Decimal("1000.0"),
    "ml": Decimal("1.0"),
    "liter": Decimal("1000.0"),
    "liters": Decimal("1000.0"),
    "litre": Decimal("1000.0"),
    "litres": Decimal("1000.0"),
    "milliliter": Decimal("1.0"),
    "milliliters": Decimal("1.0"),
    "millilitre": Decimal("1.0"),
    "millilitres": Decimal("1.0"),
}

class UnitConversionError(ValueError):
    """Raised when unit conversion is mathematically or scientifically incompatible."""
    pass

def normalize_quantity(
    amount: float,
    unit: str,
    food_servings: Optional[List[Dict[str, Any]]] = None,
    target_basis: str = "g",
    allow_liquid_fallback: bool = False
) -> Tuple[Decimal, str, str]:
    """
    Normalizes an input quantity and unit to standard base ('g' or 'ml').
    Returns: (normalized_amount, normalized_unit, conversion_method)
    
    Rules:
    - Mass: mg, g, kg
    - Volume: ml, L
    - Serving / household measures only when a food-specific equivalent exists.
    - Reject mass-to-volume conversion unless food-specific density/serving exists or allow_liquid_fallback is True.
    - Reject negative quantities.
    """
    if amount < 0:
        raise UnitConversionError("Quantity cannot be negative")

    if not math_is_finite(amount):
        raise UnitConversionError("Quantity must be a finite numerical value")

    dec_amount = Decimal(str(amount))
    norm_unit = unit.strip().lower()

    # 1. Direct Mass Conversion
    if norm_unit in MASS_CONVERSIONS:
        grams = dec_amount * MASS_CONVERSIONS[norm_unit]
        if target_basis == "ml":
            if not allow_liquid_fallback:
                raise UnitConversionError(
                    "Mass unit cannot be converted to volume basis without food-specific density"
                )
            return grams, "ml", "liquid_density_fallback_conversion"
        return grams, "g", "standard_mass_conversion"

    # 2. Direct Volume Conversion
    if norm_unit in VOLUME_CONVERSIONS:
        milliliters = dec_amount * VOLUME_CONVERSIONS[norm_unit]
        if target_basis == "g":
            if not allow_liquid_fallback:
                raise UnitConversionError(
                    "Volume unit cannot be converted to mass basis without food-specific density"
                )
            return milliliters, "g", "liquid_density_fallback_conversion"
        return milliliters, "ml", "standard_volume_conversion"

    # 3. Check Food-Specific Serving Definitions
    if food_servings:
        for s in food_servings:
            serving_name = s.get("name", "").strip().lower()
            if serving_name == norm_unit or norm_unit in serving_name or serving_name in norm_unit:
                equivalent_val = dec_amount * Decimal(str(s["grams"]))
                return equivalent_val, target_basis, f"food_serving_equivalent:{s.get('name')}"

    # 4. Reject Incompatible or Ambiguous Household Measures
    raise UnitConversionError(
        f"Incompatible or unsupported unit '{unit}'. Food-specific serving equivalent is required. Do not infer grams from cups or household measures without density data."
    )

def math_is_finite(val: float) -> bool:
    import math
    return not (math.isnan(val) or math.isinf(val))
