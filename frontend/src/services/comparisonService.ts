import { apiClient } from './apiClient';

export interface ComparedProduct {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  servingSize?: number;
  servingUnit?: string;
  nutrients: Record<string, number | null>;
  completenessScore: number;
}

export interface ProductComparisonResponse {
  normalizeBasis: string;
  products: ComparedProduct[];
  trackedNutrients: string[];
  matrix: Record<string, (number | null)[]>;
  deltasVsFirst: Record<string, (number | null)[]>;
  missingFieldsByProduct: Record<string, string[]>;
}

export const comparisonService = {
  async compareFoods(foodIds: string[], normalizeBasis: 'per_100g' | 'per_100ml' | 'serving' = 'per_100g'): Promise<ProductComparisonResponse> {
    const res = await apiClient.post('/comparison', {
      foodIds,
      normalizeBasis
    });
    return res.data?.data;
  }
};
