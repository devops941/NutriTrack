from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class ComparisonRequest(BaseModel):
    foodIds: List[str] = Field(min_length=2, max_length=4)
    normalizeBasis: str = "per_100g"  # "per_100g", "per_100ml", or "serving"

class ComparedProductItem(BaseModel):
    id: str
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    servingSize: Optional[float] = None
    servingUnit: Optional[str] = None
    nutrients: Dict[str, Optional[float]]
    completenessScore: float

class ProductComparisonResult(BaseModel):
    normalizeBasis: str
    products: List[ComparedProductItem]
    trackedNutrients: List[str]
    matrix: Dict[str, List[Optional[float]]]
    deltasVsFirst: Dict[str, List[Optional[float]]]
    missingFieldsByProduct: Dict[str, List[str]]
