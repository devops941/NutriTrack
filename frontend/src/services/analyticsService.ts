import { apiClient } from './apiClient';

export interface PeriodInfo {
  startDate: string;
  endDate: string;
  totalDays: number;
}

export interface CompletenessMetrics {
  loggedDays: number;
  unloggedDays: number;
  completenessRatio: number;
  completenessPercentage: number;
  observationNote: string;
}

export interface MetricStatistics {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
}

export interface MacroDistribution {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
  proteinPercentage: number;
  carbsPercentage: number;
  fatPercentage: number;
}

export interface DailyTrendPoint {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  mealCount: number;
  isLogged: boolean;
}

export interface AnalyticsSummary {
  period: PeriodInfo;
  completeness: CompletenessMetrics;
  statistics: Record<string, MetricStatistics>;
  macroDistribution: MacroDistribution;
  trendSeries: DailyTrendPoint[];
}

export const analyticsService = {
  async getSummary(days: number = 7): Promise<AnalyticsSummary> {
    const res = await apiClient.get('/analytics/summary', { params: { days } });
    return res.data?.data;
  },

  async getDailyRange(startDate: string, endDate: string): Promise<AnalyticsSummary> {
    const res = await apiClient.get('/analytics/daily', { params: { startDate, endDate } });
    return res.data?.data;
  },

  async getWeekly(): Promise<AnalyticsSummary> {
    const res = await apiClient.get('/analytics/weekly');
    return res.data?.data;
  },

  async getMonthly(): Promise<AnalyticsSummary> {
    const res = await apiClient.get('/analytics/monthly');
    return res.data?.data;
  },

  async seedDemoData(): Promise<any> {
    const res = await apiClient.post('/analytics/seed-demo');
    return res.data?.data;
  }
};
