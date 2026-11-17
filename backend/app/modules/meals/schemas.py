from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class MealItemInput(BaseModel):
    foodId: str = Field(..., description="ObjectId of the food item")
    quantity: float = Field(..., gt=0, description="Amount consumed")
    unit: str = Field("g", description="Unit of consumption (e.g. g, ml, cup, bowl)")

class MealItemSnapshot(BaseModel):
    foodId: str
    foodNameSnapshot: str
    quantity: float
    unit: str
    nutrientSnapshot: Dict[str, Optional[float]]
    sourceVersion: Optional[str] = "v1"

class MealCreate(BaseModel):
    mealType: str = Field(..., description="breakfast, morning_snack, lunch, evening_snack, dinner, custom")
    consumedAt: Optional[datetime] = None
    dateStr: Optional[str] = None # e.g. "2026-11-17"
    items: List[MealItemInput] = Field(..., min_length=1)
    notes: Optional[str] = None

class MealUpdate(BaseModel):
    mealType: Optional[str] = None
    consumedAt: Optional[datetime] = None
    items: Optional[List[MealItemInput]] = None
    notes: Optional[str] = None

class MealResponse(BaseModel):
    id: str
    userId: str
    mealType: str
    consumedAt: datetime
    dateStr: str
    items: List[MealItemSnapshot]
    mealTotals: Dict[str, Optional[float]]
    notes: Optional[str] = None

class DailyMealsSummary(BaseModel):
    date: str
    meals: List[MealResponse]
    dailyTotals: Dict[str, Optional[float]]
    mealsCount: int
    itemsCount: int

class SaveMealTemplateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    mealType: str
    items: List[MealItemInput]

class MealTemplateResponse(BaseModel):
    id: str
    name: str
    mealType: str
    items: List[Dict[str, Any]]
