import os
import pytest
from app.modules.reports.csv_generator import generate_csv_report
from app.modules.reports.excel_generator import generate_excel_report
from app.modules.reports.pdf_generator import generate_pdf_report

@pytest.fixture
def sample_report_payload():
    return {
        "reportId": "rep_12345678",
        "startDate": "2026-11-11",
        "endDate": "2026-11-17",
        "generatedAt": "2026-11-17T15:30:00Z",
        "userEmail": "gokul@nutritrack.io",
        "statistics": {
            "energyKcal": {"mean": 1850.0, "median": 1800.0, "min": 1500.0, "max": 2200.0, "stdDev": 220.0},
            "proteinG": {"mean": 85.0, "median": 82.0, "min": 65.0, "max": 110.0, "stdDev": 14.5},
            "carbohydrateG": {"mean": 210.0, "median": 205.0, "min": 170.0, "max": 260.0, "stdDev": 28.0},
            "fatG": {"mean": 62.0, "median": 60.0, "min": 45.0, "max": 80.0, "stdDev": 11.0},
            "fiberG": {"mean": 28.0, "median": 27.0, "min": 20.0, "max": 35.0, "stdDev": 4.5},
            "sodiumMg": {"mean": 1850.0, "median": 1800.0, "min": 1400.0, "max": 2300.0, "stdDev": 260.0}
        },
        "macroDistribution": {
            "carbsPct": 45.4,
            "proteinPct": 18.4,
            "fatPct": 30.2,
            "carbsG": 210.0,
            "proteinG": 85.0,
            "fatG": 62.0
        },
        "trendSeries": [
            {
                "date": "2026-11-17",
                "calories": 1950.0,
                "protein": 90.0,
                "carbs": 220.0,
                "fat": 65.0,
                "fiber": 30.0,
                "sodium": 1900.0,
                "mealCount": 3,
                "isLogged": True
            }
        ],
        "completeness": {
            "loggedDays": 5,
            "totalDays": 7,
            "completenessPercent": 71.4
        },
        "targets": {
            "energyKcal": 2110.0,
            "proteinG": 54.0,
            "carbohydrateG": 260.0,
            "fatG": 30.0,
            "fiberG": 30.0,
            "sodiumMg": 2000.0
        }
    }

def test_generate_csv_report(sample_report_payload, tmp_path):
    output_file = str(tmp_path / "test_report.csv")
    res = generate_csv_report(sample_report_payload, output_file)
    assert os.path.exists(res)
    assert os.path.getsize(res) > 0
    with open(res, "r", encoding="utf-8") as f:
        content = f.read()
        assert "NutriTrack Nutrition Report" in content
        assert "2026-11-17" in content

def test_generate_excel_report(sample_report_payload, tmp_path):
    output_file = str(tmp_path / "test_report.xlsx")
    res = generate_excel_report(sample_report_payload, output_file)
    assert os.path.exists(res)
    assert os.path.getsize(res) > 1000

def test_generate_pdf_report(sample_report_payload, tmp_path):
    output_file = str(tmp_path / "test_report.pdf")
    res = generate_pdf_report(sample_report_payload, output_file)
    assert os.path.exists(res)
    assert os.path.getsize(res) > 1000
