import { apiClient } from './apiClient';

export interface ConvertResult {
  originalQuantity: { amount: number; unit: string };
  normalizedQuantity: { amount: number; unit: string };
  conversionMethod: string;
}

export interface CalculationResult {
  foodId: string;
  foodName: string;
  originalQuantity: { amount: number; unit: string };
  normalizedQuantity: { amount: number; unit: string };
  nutrients: {
    energyKcal?: number;
    proteinG?: number;
    carbohydrateG?: number;
    fatG?: number;
    fiberG?: number;
    sugarsG?: number;
    sodiumMg?: number;
  };
  dataQuality: {
    knownNutrientsCount: number;
    missingNutrientsCount: number;
    missingFields: string[];
    completenessRatio: number;
    isComplete: boolean;
    warnings: string[];
  };
  calculationMethod: string;
}

export const nutritionService = {
  async convertQuantity(amount: number, unit: string, targetBasis: string = 'g', foodId?: string): Promise<ConvertResult> {
    const res = await apiClient.post('/nutrition/convert', { amount, unit, targetBasis, foodId });
    return res.data.data;
  },

  async calculateNutrition(foodId: string, quantity: number, unit: string = 'g'): Promise<CalculationResult> {
    const res = await apiClient.post('/nutrition/calculate', { foodId, quantity, unit });
    return res.data.data;
  },

  async aggregateNutrients(nutrientSnapshots: any[]) {
    const res = await apiClient.post('/nutrition/aggregate', { nutrientSnapshots });
    return res.data.data;
  },
};
