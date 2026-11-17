import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from typing import Dict, Any

def generate_pdf_report(report_data: Dict[str, Any], output_path: str) -> str:
    """
    Renders an editorial-quality PDF report with ReportLab using the
    Organic Intelligence aesthetic (#244C3B Forest Green, #A9BDA9 Sage, #F7F6F0 Warm Ivory).
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    styles = getSampleStyleSheet()

    # Brand Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#244C3B'),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=11,
        textColor=colors.HexColor('#252A27'),
        spaceAfter=14
    )

    meta_style = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#7E8982'),
        spaceAfter=14
    )

    section_heading = ParagraphStyle(
        'SectionHead',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=colors.HexColor('#244C3B'),
        spaceBefore=12,
        spaceAfter=8
    )

    disclaimer_style = ParagraphStyle(
        'DisclaimerText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#7E8982')
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("NutriTrack - Nutritional Intake & Analytics Report", title_style))
    story.append(Paragraph("Smart Food Label Intelligence & Dietary Analysis System", subtitle_style))
    
    meta_text = (
        f"<b>Reporting Window:</b> {report_data.get('startDate')} to {report_data.get('endDate')} &nbsp;|&nbsp; "
        f"<b>Generated At:</b> {report_data.get('generatedAt')[:19].replace('T', ' ')} UTC &nbsp;|&nbsp; "
        f"<b>User:</b> {report_data.get('userEmail', 'Anonymous')}"
    )
    story.append(Paragraph(meta_text, meta_style))
    story.append(Spacer(1, 8))

    # 2. Intake Summary vs Target Attainment Table
    story.append(Paragraph("1. Daily Average Nutrient Consumption", section_heading))
    stats = report_data.get("statistics", {})
    targets = report_data.get("targets", {})

    summary_headers = ["Tracked Nutrient", "Recorded Daily Mean", "Reference Target", "Attainment"]
    summary_rows = [summary_headers]

    nutrient_defs = [
        ("energyKcal", "Energy", "kcal", 2110.0),
        ("proteinG", "Protein", "g", 54.0),
        ("carbohydrateG", "Carbohydrates", "g", 260.0),
        ("fatG", "Total Fat", "g", 30.0),
        ("fiberG", "Dietary Fiber", "g", 30.0),
        ("sodiumMg", "Sodium", "mg", 2000.0),
    ]

    for key, name, unit, default_target in nutrient_defs:
        mean_val = stats.get(key, {}).get("mean", 0.0)
        target_val = targets.get(key, default_target)
        attainment = f"{round((mean_val / target_val) * 100.0, 1)}%" if target_val > 0 else "N/A"
        summary_rows.append([
            f"{name} ({unit})",
            f"{mean_val} {unit}",
            f"{target_val} {unit}",
            attainment
        ])

    t1 = Table(summary_rows, colWidths=[140, 130, 130, 130])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#244C3B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F7F6F0')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#A9BDA9')),
    ]))
    story.append(t1)
    story.append(Spacer(1, 14))

    # 3. Caloric Macronutrient Energy Ratio
    story.append(Paragraph("2. Caloric Macronutrient Distribution (4 / 4 / 9 Formula)", section_heading))
    dist = report_data.get("macroDistribution", {})
    macro_rows = [
        ["Macronutrient", "Daily Grams", "Caloric Contribution", "% of Total Calories"],
        ["Protein (4 kcal/g)", f"{dist.get('proteinGrams', 0.0)} g", f"{dist.get('proteinCalories', 0.0)} kcal", f"{dist.get('proteinPercentage', 0.0)}%"],
        ["Carbohydrates (4 kcal/g)", f"{dist.get('carbsGrams', 0.0)} g", f"{dist.get('carbsCalories', 0.0)} kcal", f"{dist.get('carbsPercentage', 0.0)}%"],
        ["Total Fat (9 kcal/g)", f"{dist.get('fatGrams', 0.0)} g", f"{dist.get('fatCalories', 0.0)} kcal", f"{dist.get('fatPercentage', 0.0)}%"]
    ]
    t2 = Table(macro_rows, colWidths=[140, 130, 130, 130])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#244C3B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#FFFFFF')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#A9BDA9')),
    ]))
    story.append(t2)
    story.append(Spacer(1, 14))

    # 4. Daily Intake Log Table
    trend_series = report_data.get("trendSeries", [])
    if trend_series:
        story.append(Paragraph("3. Daily Timeline Records", section_heading))
        daily_headers = ["Date", "Calories", "Protein", "Carbs", "Fat", "Meals Logged"]
        daily_rows = [daily_headers]
        for p in trend_series[:14]:  # Show up to 14 days in PDF
            logged_str = f"Yes ({p.get('mealCount', 1)} meals)" if p.get("isLogged") else "Unlogged"
            daily_rows.append([
                p.get("date", ""),
                f"{p.get('calories', 0)} kcal",
                f"{p.get('protein', 0)} g",
                f"{p.get('carbs', 0)} g",
                f"{p.get('fat', 0)} g",
                logged_str
            ])
        t3 = Table(daily_rows, colWidths=[90, 85, 85, 85, 85, 100])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#244C3B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F7F6F0')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#A9BDA9')),
        ]))
        story.append(t3)
        story.append(Spacer(1, 16))

    # 5. Data Completeness & Legal Disclaimer Footer
    comp = report_data.get("completeness", {})
    completeness_text = (
        f"<b>Logging Completeness:</b> {comp.get('loggedDays', 0)} of {comp.get('totalDays', 0)} days logged "
        f"({comp.get('completenessPercentage', 0)}%). {comp.get('observationNote', '')}"
    )
    story.append(Paragraph(completeness_text, meta_style))
    story.append(Spacer(1, 8))

    disclaimer = (
        "<b>LEGAL & CLINICAL NOTICE:</b> NutriTrack is an informational tracking application intended solely for personal "
        "dietary awareness. It does not provide medical diagnoses, treatment recommendations, or therapeutic prescriptions. "
        "Individuals with medical conditions, pregnancy, or metabolic disorders should consult a licensed physician or registered dietitian."
    )
    story.append(Paragraph(disclaimer, disclaimer_style))

    doc.build(story)
    return output_path
