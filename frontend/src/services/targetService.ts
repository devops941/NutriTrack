import { apiClient } from './apiClient';

export interface ReferenceSet {
  id: string;
  code: string;
  name: string;
  jurisdiction: string;
  population: string;
  source: string;
  targets: Record<string, number>;
  description?: string;
}

export interface UserTargetProfile {
  userId: string;
  referenceSetCode: string;
  effectiveTargets: Record<string, number>;
  customTargets?: Record<string, number>;
  updatedAt?: string;
}

export interface NutrientProgressItem {
  nutrient: string;
  consumed: number;
  target: number;
  remaining: number;
  progressPercentage: number;
  status: 'on_track' | 'approaching' | 'exceeded' | 'under';
  isLimit: boolean;
}

export interface DailyTargetProgress {
  date: string;
  referenceSource: string;
  disclaimer: string;
  overallCompletenessPercent: number;
  items: NutrientProgressItem[];
}

export const targetService = {
  async getReferenceSets(): Promise<ReferenceSet[]> {
    const res = await apiClient.get('/targets/reference-sets');
    return res.data?.data || [];
  },

  async getUserTargets(): Promise<UserTargetProfile> {
    const res = await apiClient.get('/targets/me');
    return res.data?.data;
  },

  async updateTargets(data: { referenceSetCode?: string; customTargets?: Record<string, number> }): Promise<UserTargetProfile> {
    const res = await apiClient.put('/targets/me', data);
    return res.data?.data;
  },

  async getDailyProgress(date?: string): Promise<DailyTargetProgress> {
    const params = date ? { date } : {};
    const res = await apiClient.get('/targets/progress', { params });
    return res.data?.data;
  }
};
