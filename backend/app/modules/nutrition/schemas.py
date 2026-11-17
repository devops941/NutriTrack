from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class UnitConvertRequest(BaseModel):
    amount: float = Field(..., description="Quantity to convert")
    unit: str = Field(..., description="Unit (e.g. mg, g, kg, ml, L, or serving name)")
    foodId: Optional[str] = Field(None, description="Optional foodId to lookup custom serving equivalents")
    targetBasis: str = Field("g", description="Target base unit: 'g' or 'ml'")

class UnitConvertResponse(BaseModel):
    originalQuantity: Dict[str, Any]
    normalizedQuantity: Dict[str, Any]
    conversionMethod: str

class NutrientCalculateRequest(BaseModel):
    foodId: str = Field(..., description="ObjectId of the food item in the food repository")
    quantity: float = Field(..., gt=0, description="Amount consumed")
    unit: str = Field("g", description="Unit of consumption (e.g. g, kg, ml, or defined serving)")

class NutrientCalculateResponse(BaseModel):
    foodId: str
    foodName: str
    originalQuantity: Dict[str, Any]
    normalizedQuantity: Dict[str, Any]
    nutrients: Dict[str, Optional[float]]
    dataQuality: Dict[str, Any]
    calculationMethod: str

class AggregateNutrientsRequest(BaseModel):
    nutrientSnapshots: List[Dict[str, Optional[float]]] = Field(..., min_length=1)

class AggregateNutrientsResponse(BaseModel):
    totals: Dict[str, Optional[float]]
    dataQuality: Dict[str, Any]
    itemsCount: int
