import pytest
from decimal import Decimal
import math
import sys

sys.path.insert(0, 'backend')

from app.engines.unit_converter import normalize_quantity, UnitConversionError
from app.engines.calculation_engine import calculate_per_100g, assess_data_quality
from app.engines.aggregation_engine import aggregate_nutrients

# --- Critical Test Cases specified in Documentation Section 14.1 ---

def test_oats_protein_calculation_spec_case():
    """
    Spec: 50g of food with 16.9g protein per 100g calculates to 8.45g protein before display rounding.
    """
    raw_nutrients = {
        "energyKcal": 389.0,
        "proteinG": 16.9,
        "carbohydrateG": 66.3,
        "fatG": 6.9,
        "fiberG": 10.6,
        "sugarsG": 0.9,
        "sodiumMg": 2.0
    }
    result = calculate_per_100g(raw_nutrients, Decimal("50.0"))
    assert result["proteinG"] == 8.45
    assert result["energyKcal"] == 194.5
    assert result["carbohydrateG"] == 33.15
    assert result["fatG"] == 3.45

def test_mass_conversions_spec_case():
    """
    Spec: 1000mg converts to 1g; 1kg converts to 1000g.
    """
    amount_g, unit, method = normalize_quantity(1000, "mg")
    assert amount_g == Decimal("1.0")
    assert unit == "g"

    amount_g, unit, method = normalize_quantity(1, "kg")
    assert amount_g == Decimal("1000.0")
    assert unit == "g"

def test_volume_conversions_spec_case():
    """
    Spec: 1L converts to 1000ml.
    """
    amount_ml, unit, method = normalize_quantity(1, "L", target_basis="ml")
    assert amount_ml == Decimal("1000.0")
    assert unit == "ml"

def test_reject_mass_to_volume_without_food_data_spec_case():
    """
    Spec: Mass-to-volume conversion is rejected without food-specific data.
    """
    with pytest.raises(UnitConversionError):
        normalize_quantity(250, "g", target_basis="ml")

    with pytest.raises(UnitConversionError):
        normalize_quantity(500, "ml", target_basis="g")

    with pytest.raises(UnitConversionError):
        # Do not infer grams from cups without serving definition
        normalize_quantity(2, "cups")

def test_custom_food_serving_equivalent():
    """
    Spec: When food defines '1 cup = 80g', 2 cups converts to 160g.
    """
    servings = [{"name": "1 cup", "grams": 80.0}, {"name": "1 bowl", "grams": 40.0}]
    amount_g, unit, method = normalize_quantity(2, "1 cup", food_servings=servings)
    assert amount_g == Decimal("160.0")
    assert unit == "g"

def test_missing_nutrients_remain_null_and_warn_spec_case():
    """
    Spec: Missing nutrients remain null and produce completeness warnings.
    """
    raw_nutrients = {
        "energyKcal": 200.0,
        "proteinG": 10.0,
        "carbohydrateG": None,
        "fatG": None
    }
    result = calculate_per_100g(raw_nutrients, Decimal("100.0"))
    assert result["proteinG"] == 10.0
    assert result["carbohydrateG"] is None
    assert result["fatG"] is None

    quality = assess_data_quality(result)
    assert quality["isComplete"] is False
    assert "carbohydrateG" in quality["missingFields"]
    assert "fatG" in quality["missingFields"]
    assert len(quality["warnings"]) > 0

def test_reject_negative_and_non_finite_quantities_spec_case():
    """
    Spec: Negative and non-finite quantities are rejected.
    """
    with pytest.raises(UnitConversionError):
        normalize_quantity(-50, "g")

    with pytest.raises(UnitConversionError):
        normalize_quantity(float("nan"), "g")

    with pytest.raises(UnitConversionError):
        normalize_quantity(float("inf"), "g")

def test_aggregation_engine_multiple_foods():
    """
    Spec: Multi-item nutrient aggregation retains accuracy and data completeness.
    """
    item1 = {"energyKcal": 194.5, "proteinG": 8.45, "carbohydrateG": 33.15, "fatG": 3.45}
    item2 = {"energyKcal": 152.5, "proteinG": 8.0, "carbohydrateG": 12.0, "fatG": 8.25}
    
    agg = aggregate_nutrients([item1, item2])
    assert agg["itemsCount"] == 2
    assert agg["totals"]["energyKcal"] == 347.0
    assert agg["totals"]["proteinG"] == 16.45
    assert agg["totals"]["carbohydrateG"] == 45.15
    assert agg["totals"]["fatG"] == 11.7
    assert agg["dataQuality"]["isComplete"] is False # fiberG, etc. missing
