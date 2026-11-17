import { apiClient } from './apiClient';

export interface MealItemSnapshot {
  foodId: string;
  foodNameSnapshot: string;
  quantity: number;
  unit: string;
  nutrientSnapshot: {
    energyKcal?: number;
    proteinG?: number;
    carbohydrateG?: number;
    fatG?: number;
    fiberG?: number;
    sugarsG?: number;
    sodiumMg?: number;
  };
  sourceVersion?: string;
}

export interface Meal {
  id: string;
  userId: string;
  mealType: string;
  consumedAt: string;
  dateStr: string;
  items: MealItemSnapshot[];
  mealTotals: {
    energyKcal?: number;
    proteinG?: number;
    carbohydrateG?: number;
    fatG?: number;
    fiberG?: number;
    sodiumMg?: number;
  };
  notes?: string;
}

export interface DailyDiarySummary {
  date: string;
  meals: Meal[];
  dailyTotals: {
    energyKcal?: number;
    proteinG?: number;
    carbohydrateG?: number;
    fatG?: number;
    fiberG?: number;
    sodiumMg?: number;
  };
  mealsCount: number;
  itemsCount: number;
}

export interface LogMealPayload {
  mealType: string;
  consumedAt?: string;
  dateStr?: string;
  items: Array<{ foodId: string; quantity: number; unit: string }>;
  notes?: string;
}

export const mealService = {
  async getDailyMeals(dateStr: string): Promise<DailyDiarySummary> {
    const res = await apiClient.get('/meals/daily', { params: { date: dateStr } });
    return res.data.data;
  },

  async logMeal(payload: LogMealPayload): Promise<Meal> {
    const res = await apiClient.post('/meals', payload);
    return res.data.data;
  },

  async deleteMeal(mealId: string) {
    const res = await apiClient.delete(`/meals/${mealId}`);
    return res.data.data;
  },

  async saveTemplate(name: string, mealType: string, items: any[]) {
    const res = await apiClient.post('/meals/templates', { name, mealType, items });
    return res.data.data;
  },

  async getTemplates() {
    const res = await apiClient.get('/meals/templates/all');
    return res.data.data;
  },
};
