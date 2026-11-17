from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class PeriodInfo(BaseModel):
    startDate: str
    endDate: str
    totalDays: int

class CompletenessMetrics(BaseModel):
    loggedDays: int
    unloggedDays: int
    completenessRatio: float
    completenessPercentage: float
    observationNote: str

class MetricStatistics(BaseModel):
    mean: float
    median: float
    min: float
    max: float
    stdDev: float

class MacroDistribution(BaseModel):
    proteinGrams: float
    carbsGrams: float
    fatGrams: float
    proteinCalories: float
    carbsCalories: float
    fatCalories: float
    proteinPercentage: float
    carbsPercentage: float
    fatPercentage: float

class DailyTrendPoint(BaseModel):
    date: str
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    sodium: float
    mealCount: int
    isLogged: bool

class AnalyticsSummaryResponse(BaseModel):
    period: PeriodInfo
    completeness: CompletenessMetrics
    statistics: Dict[str, MetricStatistics]
    macroDistribution: MacroDistribution
    trendSeries: List[DailyTrendPoint]
