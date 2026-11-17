from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ReportGenerateRequest(BaseModel):
    format: str = "pdf"  # "pdf", "excel", "csv"
    startDate: str  # YYYY-MM-DD
    endDate: str  # YYYY-MM-DD
    title: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    userId: str
    format: str
    fileName: str
    fileSize: int
    downloadUrl: str
    startDate: str
    endDate: str
    generatedAt: str
    status: str = "completed"
