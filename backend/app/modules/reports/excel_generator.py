import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from typing import Dict, Any

def generate_excel_report(report_data: Dict[str, Any], output_path: str) -> str:
    """
    Generates a structured multi-sheet Excel workbook (.xlsx) via openpyxl.
    """
    wb = openpyxl.Workbook()

    header_fill = PatternFill(start_color="244C3B", end_color="244C3B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Calibri", size=10)
    center_align = Alignment(horizontal="center", vertical="center")
    thin_border = Border(
        left=Side(style='thin', color='A9BDA9'),
        right=Side(style='thin', color='A9BDA9'),
        top=Side(style='thin', color='A9BDA9'),
        bottom=Side(style='thin', color='A9BDA9')
    )

    # ----------------------------------------------------
    # Sheet 1: Intake Summary & Metrics
    # ----------------------------------------------------
    ws1 = wb.active
    ws1.title = "Intake Summary"

    ws1.append(["NutriTrack - Nutritional Intake Report"])
    ws1.cell(row=1, column=1).font = Font(name="Calibri", size=14, bold=True, color="244C3B")
    ws1.append([f"Period: {report_data.get('startDate')} to {report_data.get('endDate')}"])
    ws1.cell(row=2, column=1).font = Font(name="Calibri", size=10, italic=True, color="7E8982")
    ws1.append([])

    headers1 = ["Nutrient", "Recorded Daily Mean", "Median", "Min", "Max", "Standard Deviation"]
    ws1.append(headers1)
    for col_idx in range(1, len(headers1) + 1):
        cell = ws1.cell(row=4, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align

    stats = report_data.get("statistics", {})
    stat_rows = [
        ("Energy (kcal)", stats.get("energyKcal", {})),
        ("Protein (g)", stats.get("proteinG", {})),
        ("Carbohydrates (g)", stats.get("carbohydrateG", {})),
        ("Total Fat (g)", stats.get("fatG", {})),
        ("Dietary Fiber (g)", stats.get("fiberG", {})),
        ("Sodium (mg)", stats.get("sodiumMg", {})),
    ]

    for label, s in stat_rows:
        ws1.append([
            label,
            s.get("mean", 0.0),
            s.get("median", 0.0),
            s.get("min", 0.0),
            s.get("max", 0.0),
            s.get("stdDev", 0.0)
        ])

    # ----------------------------------------------------
    # Sheet 2: Daily Trend & Logged Meals
    # ----------------------------------------------------
    ws2 = wb.create_sheet(title="Daily Intake Timeline")
    headers2 = ["Date", "Energy (kcal)", "Protein (g)", "Carbohydrates (g)", "Fat (g)", "Fiber (g)", "Sodium (mg)", "Meals Logged", "Logged Status"]
    ws2.append(headers2)
    for col_idx in range(1, len(headers2) + 1):
        cell = ws2.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align

    for row in report_data.get("trendSeries", []):
        ws2.append([
            row.get("date"),
            row.get("calories", 0.0),
            row.get("protein", 0.0),
            row.get("carbs", 0.0),
            row.get("fat", 0.0),
            row.get("fiber", 0.0),
            row.get("sodium", 0.0),
            row.get("mealCount", 0),
            "Logged" if row.get("isLogged") else "Unlogged"
        ])

    # ----------------------------------------------------
    # Sheet 3: Macronutrient Caloric Split
    # ----------------------------------------------------
    ws3 = wb.create_sheet(title="Macronutrient Split")
    headers3 = ["Macronutrient", "Daily Average (g)", "Multiplier (kcal/g)", "Caloric Contribution", "% of Total Calories"]
    ws3.append(headers3)
    for col_idx in range(1, len(headers3) + 1):
        cell = ws3.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align

    dist = report_data.get("macroDistribution", {})
    ws3.append(["Protein", dist.get("proteinGrams", 0.0), 4, dist.get("proteinCalories", 0.0), f"{dist.get('proteinPercentage', 0.0)}%"])
    ws3.append(["Carbohydrates", dist.get("carbsGrams", 0.0), 4, dist.get("carbsCalories", 0.0), f"{dist.get('carbsPercentage', 0.0)}%"])
    ws3.append(["Total Fat", dist.get("fatGrams", 0.0), 9, dist.get("fatCalories", 0.0), f"{dist.get('fatPercentage', 0.0)}%"])

    # Auto-adjust column widths for all sheets
    for ws in [ws1, ws2, ws3]:
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    wb.save(output_path)
    return output_path
