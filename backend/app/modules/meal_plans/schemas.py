from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class PlannedFoodItem(BaseModel):
    foodId: Optional[str] = None
    name: str
    portionGrams: float = 100.0
    nutrients: Dict[str, Optional[float]] = Field(default_factory=dict)

class PlannedMeal(BaseModel):
    mealType: str = "lunch"  # "breakfast", "lunch", "dinner", "snack"
    name: str
    items: List[PlannedFoodItem] = Field(default_factory=list)
    totalNutrients: Dict[str, float] = Field(default_factory=dict)

class MealPlanRequest(BaseModel):
    date: str  # YYYY-MM-DD
    title: Optional[str] = None
    notes: Optional[str] = None
    meals: List[PlannedMeal] = Field(default_factory=list)

class MealPlanResponse(BaseModel):
    id: str
    userId: str
    date: str
    title: Optional[str] = None
    notes: Optional[str] = None
    meals: List[PlannedMeal]
    plannedDailyTotals: Dict[str, float]
    createdAt: str
    updatedAt: str

class NutrientVarianceItem(BaseModel):
    nutrient: str
    planned: float
    actual: float
    variance: float  # actual - planned
    variancePercentage: float  # ((actual - planned) / planned) * 100
    status: str  # "on_target", "over_plan", "under_plan"

class PlannedVsActualResponse(BaseModel):
    date: str
    hasPlannedMeal: bool
    hasActualMeals: bool
    plannedMealCount: int
    actualMealCount: int
    items: List[NutrientVarianceItem]
    observation: str

class LogPlannedMealToDiaryRequest(BaseModel):
    date: str  # YYYY-MM-DD
    mealType: str  # "breakfast", "lunch", "dinner", "snack"
    name: Optional[str] = None
    items: List[PlannedFoodItem] = Field(default_factory=list)
    totalNutrients: Optional[Dict[str, float]] = Field(default_factory=dict)
