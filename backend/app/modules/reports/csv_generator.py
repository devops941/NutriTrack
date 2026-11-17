import csv
from typing import Dict, Any

def generate_csv_report(report_data: Dict[str, Any], output_path: str) -> str:
    """
    Exports daily nutrition data to a clean CSV format.
    """
    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        
        # Metadata Header Comments
        writer.writerow(["# NutriTrack Nutrition Report"])
        writer.writerow([f"# Window: {report_data.get('startDate')} to {report_data.get('endDate')}"])
        writer.writerow([f"# GeneratedAt: {report_data.get('generatedAt')}"])
        writer.writerow([f"# Notice: Informational tracking tool, not a medical device."])
        writer.writerow([])
        
        # Column Headers
        headers = [
            "Date",
            "EnergyKcal",
            "ProteinG",
            "CarbohydrateG",
            "FatG",
            "FiberG",
            "SodiumMg",
            "MealCount",
            "IsLogged"
        ]
        writer.writerow(headers)
        
        # Rows
        for row in report_data.get("trendSeries", []):
            writer.writerow([
                row.get("date"),
                row.get("calories", 0.0),
                row.get("protein", 0.0),
                row.get("carbs", 0.0),
                row.get("fat", 0.0),
                row.get("fiber", 0.0),
                row.get("sodium", 0.0),
                row.get("mealCount", 0),
                row.get("isLogged", False)
            ])
            
    return output_path
