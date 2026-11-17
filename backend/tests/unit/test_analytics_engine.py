import pytest
import sys
from datetime import date, timedelta

sys.path.insert(0, 'backend')

from app.engines.analytics_engine import compute_intake_analytics

def test_compute_intake_analytics_basic():
    today = date(2026, 11, 17)
    start_date = today - timedelta(days=6)

    # 2 sample meals on different days
    meals = [
        {
            "dateStr": "2026-11-17",
            "mealType": "lunch",
            "totalNutrients": {
                "energyKcal": 650.0,
                "proteinG": 30.0,
                "carbohydrateG": 70.0,
                "fatG": 20.0,
                "fiberG": 10.0,
                "sodiumMg": 400.0
            }
        },
        {
            "dateStr": "2026-11-16",
            "mealType": "dinner",
            "mealTotals": {
                "energyKcal": 550.0,
                "proteinG": 25.0,
                "carbohydrateG": 60.0,
                "fatG": 15.0,
                "fiberG": 8.0,
                "sodiumMg": 350.0
            }
        }
    ]

    result = compute_intake_analytics(meals, start_date, today)

    assert result["period"]["totalDays"] == 7
    assert result["completeness"]["loggedDays"] == 2
    assert result["completeness"]["unloggedDays"] == 5
    assert result["statistics"]["energyKcal"]["mean"] == 600.0
    assert result["statistics"]["energyKcal"]["min"] == 550.0
    assert result["statistics"]["energyKcal"]["max"] == 650.0
    assert len(result["trendSeries"]) == 7
