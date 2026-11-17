from pydantic import BaseModel, Field
from typing import Dict, Optional, List, Any
from datetime import datetime

class ReferenceSetResponse(BaseModel):
    id: str
    code: str
    name: str
    jurisdiction: str
    population: str
    source: str
    targets: Dict[str, float]
    description: Optional[str] = None

class UserTargetUpdate(BaseModel):
    referenceSetCode: Optional[str] = None  # e.g., "ICMR_ADULT_SEDENTARY_MALE"
    customTargets: Optional[Dict[str, float]] = None  # e.g., {"energyKcal": 2200, "proteinG": 70}

class UserTargetResponse(BaseModel):
    userId: str
    referenceSetCode: str
    effectiveTargets: Dict[str, float]
    customTargets: Optional[Dict[str, float]] = None
    updatedAt: Optional[str] = None

class NutrientProgressItem(BaseModel):
    nutrient: str
    consumed: float
    target: float
    remaining: float
    progressPercentage: float
    status: str  # "on_track", "approaching", "exceeded", "under"
    isLimit: bool = False  # True for sodium/sugars where exceeding target is negative

class DailyTargetProgressResponse(BaseModel):
    date: str
    referenceSource: str
    disclaimer: str
    overallCompletenessPercent: float
    items: List[NutrientProgressItem]
