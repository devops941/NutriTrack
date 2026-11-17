from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

class ProfileUpdate(BaseModel):
    displayName: Optional[str] = Field(None, max_length=100)
    dateOfBirth: Optional[date] = None
    gender: Optional[str] = Field(None, description="male, female, other, prefer_not_to_say")
    heightCm: Optional[float] = Field(None, ge=50, le=280)
    weightKg: Optional[float] = Field(None, ge=20, le=500)
    activityLevel: Optional[str] = Field(
        "sedentary",
        description="sedentary, lightly_active, moderately_active, very_active, extra_active"
    )
    dietaryPreferences: List[str] = Field(
        default_factory=list,
        description="e.g. vegetarian, vegan, eggetarian, pescatarian, halal, kosher"
    )
    allergies: List[str] = Field(
        default_factory=list,
        description="e.g. peanuts, tree_nuts, dairy, gluten, eggs, soy, shellfish"
    )
    excludedIngredients: List[str] = Field(default_factory=list)
    preferredUnits: str = Field("metric", description="metric (g, ml, kg) or imperial (oz, lbs)")
    dailyCalorieGoal: Optional[float] = Field(None, ge=800, le=8000)

class ProfileResponse(BaseModel):
    id: str
    userId: str
    displayName: Optional[str] = None
    dateOfBirth: Optional[date] = None
    gender: Optional[str] = None
    heightCm: Optional[float] = None
    weightKg: Optional[float] = None
    activityLevel: str = "sedentary"
    dietaryPreferences: List[str] = []
    allergies: List[str] = []
    excludedIngredients: List[str] = []
    preferredUnits: str = "metric"
    dailyCalorieGoal: Optional[float] = None
    updatedAt: Optional[datetime] = None
