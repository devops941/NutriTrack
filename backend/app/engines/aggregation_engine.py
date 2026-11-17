from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional
from app.engines.calculation_engine import TRACKED_NUTRIENTS, assess_data_quality

def aggregate_nutrients(items: List[Dict[str, Optional[float]]]) -> Dict[str, Any]:
    """
    Aggregates a collection of nutrient snapshots.
    Sums known values and maintains missing value transparency.
    """
    if not items:
        return {
            "totals": {k: 0.0 for k in TRACKED_NUTRIENTS},
            "dataQuality": assess_data_quality({k: None for k in TRACKED_NUTRIENTS}),
            "itemsCount": 0
        }

    totals: Dict[str, Optional[float]] = {}
    
    for nut in TRACKED_NUTRIENTS:
        known_values = []
        for item in items:
            val = item.get(nut)
            if val is not None:
                known_values.append(Decimal(str(val)))

        if not known_values:
            totals[nut] = None
        else:
            total_dec = sum(known_values).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            totals[nut] = float(total_dec)

    quality = assess_data_quality(totals)

    return {
        "totals": totals,
        "dataQuality": quality,
        "itemsCount": len(items)
    }
