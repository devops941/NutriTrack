import { apiClient } from './apiClient';

export interface PlannedFoodItem {
  foodId?: string;
  name: string;
  portionGrams: number;
  nutrients: Record<string, number | null>;
}

export interface PlannedMeal {
  mealType: string;
  name: string;
  items: PlannedFoodItem[];
  totalNutrients: Record<string, number>;
}

export interface MealPlan {
  id: string;
  userId: string;
  date: string;
  title?: string;
  notes?: string;
  meals: PlannedMeal[];
  plannedDailyTotals: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface NutrientVarianceItem {
  nutrient: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  status: 'on_target' | 'over_plan' | 'under_plan';
}

export interface PlannedVsActual {
  date: string;
  hasPlannedMeal: boolean;
  hasActualMeals: boolean;
  plannedMealCount: number;
  actualMealCount: number;
  items: NutrientVarianceItem[];
  observation: string;
}

export const plannerService = {
  async savePlan(data: { date: string; title?: string; notes?: string; meals: PlannedMeal[] }): Promise<MealPlan> {
    const res = await apiClient.post('/meal-plans', data);
    return res.data?.data;
  },

  async getPlans(startDate?: string, endDate?: string): Promise<MealPlan[]> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await apiClient.get('/meal-plans', { params });
    return res.data?.data || [];
  },

  async getDayPlan(date: string): Promise<MealPlan | null> {
    const res = await apiClient.get('/meal-plans/day', { params: { date } });
    return res.data?.data;
  },

  async deletePlan(id: string): Promise<void> {
    await apiClient.delete(`/meal-plans/${id}`);
  },

  async getVariance(date: string): Promise<PlannedVsActual> {
    const res = await apiClient.get('/meal-plans/variance', { params: { date } });
    return res.data?.data;
  },

  async logPlannedMealToDiary(payload: {
    date: string;
    mealType: string;
    name?: string;
    items?: PlannedFoodItem[];
    totalNutrients?: Record<string, number>;
  }): Promise<any> {
    const res = await apiClient.post('/meal-plans/log-to-diary', payload);
    return res.data?.data;
  }
};
