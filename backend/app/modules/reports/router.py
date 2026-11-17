import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, time
from bson import ObjectId

from app.config.database import get_database
from app.core.dependencies import get_current_user
from app.modules.reports.schemas import ReportGenerateRequest, ReportResponse
from app.engines.analytics_engine import compute_intake_analytics
from app.modules.reports.pdf_generator import generate_pdf_report
from app.modules.reports.excel_generator import generate_excel_report
from app.modules.reports.csv_generator import generate_csv_report
from app.shared.schemas.response import StandardResponse

router = APIRouter(prefix="/reports", tags=["Reports & Data Export"])

REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../uploads/reports"))
os.makedirs(REPORTS_DIR, exist_ok=True)

@router.post("/generate", response_model=StandardResponse[ReportResponse])
async def generate_report(
    body: ReportGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Generates a downloadable report in PDF, Excel, or CSV format.
    """
    user_id = str(current_user.get("_id") or current_user.get("id"))
    fmt = body.format.lower()
    if fmt not in ["pdf", "excel", "csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Choose 'pdf', 'excel', or 'csv'."
        )

    # 1. Fetch Meals for the Period
    try:
        s_date = datetime.strptime(body.startDate, "%Y-%m-%d").date()
        e_date = datetime.strptime(body.endDate, "%Y-%m-%d").date()
        start_dt = datetime.combine(s_date, time.min).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(e_date, time.max).replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    user_query = {"$in": [user_id, ObjectId(user_id)]} if ObjectId.is_valid(user_id) else user_id
    cursor = db.meals.find({
        "userId": user_query,
        "$or": [
            {"date": {"$gte": body.startDate, "$lte": body.endDate}},
            {"dateStr": {"$gte": body.startDate, "$lte": body.endDate}},
            {"consumedAt": {"$gte": start_dt, "$lte": end_dt}}
        ]
    })
    meals = []
    async for m in cursor:
        meals.append(m)

    # 2. Compute Analytics Summary
    summary = compute_intake_analytics(meals, s_date, e_date)

    # 3. Fetch User's Dietary Targets
    target_doc = await db.user_targets.find_one({"userId": user_query})
    effective_targets = target_doc.get("effectiveTargets", {}) if target_doc else {
        "energyKcal": 2110.0,
        "proteinG": 54.0,
        "carbohydrateG": 260.0,
        "fatG": 30.0,
        "fiberG": 30.0,
        "sodiumMg": 2000.0
    }

    report_id = str(ObjectId())
    now_iso = datetime.now(timezone.utc).isoformat()

    report_payload = {
        "reportId": report_id,
        "startDate": body.startDate,
        "endDate": body.endDate,
        "generatedAt": now_iso,
        "userEmail": current_user.get("email", "user@nutritrack.io"),
        "statistics": summary["statistics"],
        "macroDistribution": summary["macroDistribution"],
        "trendSeries": summary["trendSeries"],
        "completeness": summary["completeness"],
        "targets": effective_targets
    }

    # 4. Generate File on Disk
    ext_map = {"pdf": "pdf", "excel": "xlsx", "csv": "csv"}
    ext = ext_map[fmt]
    filename = f"NutriTrack_Report_{body.startDate}_to_{body.endDate}_{report_id[:8]}.{ext}"
    file_path = os.path.join(REPORTS_DIR, filename)

    if fmt == "pdf":
        generate_pdf_report(report_payload, file_path)
    elif fmt == "excel":
        generate_excel_report(report_payload, file_path)
    elif fmt == "csv":
        generate_csv_report(report_payload, file_path)

    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0

    # 5. Store Metadata in db.reports
    doc = {
        "_id": ObjectId(report_id),
        "userId": user_id,
        "format": fmt,
        "fileName": filename,
        "filePath": file_path,
        "fileSize": file_size,
        "startDate": body.startDate,
        "endDate": body.endDate,
        "generatedAt": now_iso,
        "status": "completed"
    }
    await db.reports.insert_one(doc)

    return StandardResponse(
        success=True,
        data=ReportResponse(
            id=report_id,
            userId=user_id,
            format=fmt,
            fileName=filename,
            fileSize=file_size,
            downloadUrl=f"/api/v1/reports/{report_id}/download",
            startDate=body.startDate,
            endDate=body.endDate,
            generatedAt=now_iso,
            status="completed"
        ),
        message=f"{fmt.upper()} report generated successfully"
    )

@router.get("/{id}/download")
async def download_report(
    id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Downloads a previously generated report file.
    """
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid report ID.")

    user_id = str(current_user.get("_id") or current_user.get("id"))
    user_query = {"$in": [user_id, ObjectId(user_id)]} if ObjectId.is_valid(user_id) else user_id
    report = await db.reports.find_one({"_id": ObjectId(id), "userId": user_query})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or access denied.")

    file_path = report.get("filePath")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk.")

    media_types = {
        "pdf": "application/pdf",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "text/csv"
    }
    fmt = report.get("format", "pdf")
    media_type = media_types.get(fmt, "application/octet-stream")

    return FileResponse(
        path=file_path,
        filename=report.get("fileName", f"report.{fmt}"),
        media_type=media_type
    )

@router.get("", response_model=StandardResponse[List[ReportResponse]])
async def list_reports(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    List user's generated reports history.
    """
    user_id = str(current_user.get("_id") or current_user.get("id"))
    user_query = {"$in": [user_id, ObjectId(user_id)]} if ObjectId.is_valid(user_id) else user_id
    cursor = db.reports.find({"userId": user_query}).sort("generatedAt", -1).limit(50)

    reports = []
    async for r in cursor:
        reports.append(ReportResponse(
            id=str(r["_id"]),
            userId=str(r["userId"]),
            format=r.get("format", "pdf"),
            fileName=r.get("fileName", ""),
            fileSize=r.get("fileSize", 0),
            downloadUrl=f"/api/v1/reports/{str(r['_id'])}/download",
            startDate=r.get("startDate", ""),
            endDate=r.get("endDate", ""),
            generatedAt=r.get("generatedAt", ""),
            status=r.get("status", "completed")
        ))

    return StandardResponse(
        success=True,
        data=reports,
        message=f"Loaded {len(reports)} reports"
    )
