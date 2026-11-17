from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class LabelFieldCandidate(BaseModel):
    field: str
    rawMatch: Optional[str] = None
    value: Optional[float] = None
    unit: str
    confidence: float
    reviewStatus: str # needs_review, verified, missing

class LabelUploadResponse(BaseModel):
    labelId: str
    fileRef: str
    originalFilename: str
    status: str

class LabelExtractResponse(BaseModel):
    labelId: str
    engine: str
    isFallback: bool
    candidateName: str
    servingBasis: Dict[str, Any]
    fields: List[LabelFieldCandidate]
    nutrients: Dict[str, Optional[float]]
    rawText: str

class LabelReviewRequest(BaseModel):
    labelId: str
    foodName: str = Field(..., min_length=2)
    brand: Optional[str] = None
    categoryId: Optional[str] = "grains"
    nutrients: Dict[str, Optional[float]]
    basis: Dict[str, Any] = {"amount": 100.0, "unit": "g"}
    action: str = Field("save_to_foods", description="'save_to_foods' or 'mark_reviewed'")
    notes: Optional[str] = None

class LabelReviewResponse(BaseModel):
    labelId: str
    reviewStatus: str
    foodId: Optional[str] = None
    auditEvent: Dict[str, Any]
