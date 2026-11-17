import pandas as pd
import numpy as np
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

TRACKED_STATS_KEYS = [
    "energyKcal",
    "proteinG",
    "carbohydrateG",
    "fatG",
    "fiberG",
    "sodiumMg"
]

def compute_intake_analytics(meals: List[Dict[str, Any]], start_date: date, end_date: date) -> Dict[str, Any]:
    """
    Computes daily totals, statistical distributions (mean, median, min, max, std dev),
    macronutrient caloric ratios, and data completeness metrics using Pandas and NumPy.
    """
    days_count = (end_date - start_date).days + 1
    date_range = [start_date + timedelta(days=i) for i in range(days_count)]
    date_strings = [d.isoformat() for d in date_range]

    # Initialize daily bucket
    daily_records: Dict[str, Dict[str, Any]] = {
        d_str: {
            "energyKcal": 0.0,
            "proteinG": 0.0,
            "carbohydrateG": 0.0,
            "fatG": 0.0,
            "fiberG": 0.0,
            "sodiumMg": 0.0,
            "mealCount": 0
        } for d_str in date_strings
    }

    logged_days_set = set()

    for m in meals:
        # Determine date string
        d_str = None
        if "date" in m and isinstance(m["date"], str) and len(m["date"]) >= 10:
            d_str = m["date"][:10]
        elif "dateStr" in m and isinstance(m["dateStr"], str) and len(m["dateStr"]) >= 10:
            d_str = m["dateStr"][:10]
        elif "consumedAt" in m:
            consumed = m["consumedAt"]
            if isinstance(consumed, datetime):
                d_str = consumed.date().isoformat()
            elif isinstance(consumed, str) and len(consumed) >= 10:
                d_str = consumed[:10]

        if d_str and d_str in daily_records:
            logged_days_set.add(d_str)
            daily_records[d_str]["mealCount"] += 1
            
            # Use totalNutrients or mealTotals if present on meal, else aggregate from items
            totals = m.get("totalNutrients") or m.get("mealTotals") or {}
            has_totals = any(totals.get(k) is not None for k in TRACKED_STATS_KEYS)
            if has_totals:
                for k in TRACKED_STATS_KEYS:
                    val = totals.get(k)
                    if val is not None:
                        daily_records[d_str][k] += float(val)
            else:
                for item in m.get("items", []):
                    snap = item.get("nutrientSnapshot") or item.get("nutrients") or {}
                    for k in TRACKED_STATS_KEYS:
                        val = snap.get(k)
                        if val is not None:
                            daily_records[d_str][k] += float(val)

    # Convert to Pandas DataFrame
    df = pd.DataFrame.from_dict(daily_records, orient="index")

    total_days = len(date_strings)
    logged_days = len(logged_days_set)
    unlogged_days = total_days - logged_days
    completeness_ratio = round(logged_days / total_days, 2) if total_days > 0 else 0.0
    completeness_pct = round(completeness_ratio * 100.0, 1)

    # Filter to only logged days for statistical summaries
    logged_df = df[df["mealCount"] > 0]

    stats: Dict[str, Dict[str, float]] = {}
    for k in TRACKED_STATS_KEYS:
        if not logged_df.empty and k in logged_df.columns:
            series = logged_df[k].astype(float)
            std_val = float(series.std(ddof=1)) if len(series) > 1 else 0.0
            stats[k] = {
                "mean": round(float(series.mean()), 1),
                "median": round(float(series.median()), 1),
                "min": round(float(series.min()), 1),
                "max": round(float(series.max()), 1),
                "stdDev": round(0.0 if np.isnan(std_val) else std_val, 1)
            }
        else:
            stats[k] = {
                "mean": 0.0,
                "median": 0.0,
                "min": 0.0,
                "max": 0.0,
                "stdDev": 0.0
            }

    # Macro distribution (Protein 4 kcal/g, Carbs 4 kcal/g, Fat 9 kcal/g)
    avg_prot_g = stats["proteinG"]["mean"]
    avg_carbs_g = stats["carbohydrateG"]["mean"]
    avg_fat_g = stats["fatG"]["mean"]

    prot_cal = round(avg_prot_g * 4.0, 1)
    carbs_cal = round(avg_carbs_g * 4.0, 1)
    fat_cal = round(avg_fat_g * 9.0, 1)
    total_macro_cal = prot_cal + carbs_cal + fat_cal

    macro_dist = {
        "proteinGrams": avg_prot_g,
        "carbsGrams": avg_carbs_g,
        "fatGrams": avg_fat_g,
        "proteinCalories": prot_cal,
        "carbsCalories": carbs_cal,
        "fatCalories": fat_cal,
        "proteinPercentage": round((prot_cal / total_macro_cal) * 100.0, 1) if total_macro_cal > 0 else 0.0,
        "carbsPercentage": round((carbs_cal / total_macro_cal) * 100.0, 1) if total_macro_cal > 0 else 0.0,
        "fatPercentage": round((fat_cal / total_macro_cal) * 100.0, 1) if total_macro_cal > 0 else 0.0
    }

    # Trend series for frontend charting
    trend_series = []
    for d_str in date_strings:
        row = daily_records[d_str]
        trend_series.append({
            "date": d_str,
            "calories": round(row["energyKcal"], 1),
            "protein": round(row["proteinG"], 1),
            "carbs": round(row["carbohydrateG"], 1),
            "fat": round(row["fatG"], 1),
            "fiber": round(row["fiberG"], 1),
            "sodium": round(row["sodiumMg"], 1),
            "mealCount": int(row["mealCount"]),
            "isLogged": row["mealCount"] > 0
        })

    # Neutral, objective completeness observation
    if unlogged_days == 0:
        note = f"Full records available across all {total_days} days in this timeframe (100% logging completeness)."
    elif logged_days == 0:
        note = f"No meal entries logged in the selected {total_days}-day timeframe."
    else:
        note = f"Data logged across {logged_days} of {total_days} days ({completeness_pct}% completeness). {unlogged_days} unlogged day(s) omitted from daily statistical averages."

    return {
        "period": {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "totalDays": total_days
        },
        "completeness": {
            "loggedDays": logged_days,
            "unloggedDays": unlogged_days,
            "completenessRatio": completeness_ratio,
            "completenessPercentage": completeness_pct,
            "observationNote": note
        },
        "statistics": stats,
        "macroDistribution": macro_dist,
        "trendSeries": trend_series
    }
