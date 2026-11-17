import { apiClient } from './apiClient';

export interface Nutrients {
  energyKcal?: number;
  proteinG?: number;
  carbohydrateG?: number;
  fatG?: number;
  fiberG?: number;
  sugarsG?: number;
  sodiumMg?: number;
}

export interface Serving {
  name: string;
  grams: number;
}

export interface FoodItem {
  id: string;
  name: string;
  normalizedName?: string;
  brand?: string;
  barcode?: string;
  categoryId: string;
  categoryName?: string;
  basis: { amount: number; unit: string };
  nutrients: Nutrients;
  servings?: Serving[];
  source?: { name: string; referenceId?: string };
  verificationStatus: string;
}

export interface FoodListResponse {
  foods: FoodItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export const foodService = {
  async getCategories(): Promise<Category[]> {
    const res = await apiClient.get('/foods/categories');
    return res.data.data;
  },

  async getFoods(params?: { q?: string; category?: string; page?: number; limit?: number }): Promise<FoodListResponse> {
    const res = await apiClient.get('/foods', { params });
    return res.data.data;
  },

  async listFoods(params?: { q?: string; category?: string; page?: number; limit?: number; pageSize?: number }): Promise<{ items: FoodItem[]; foods: FoodItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const p = {
      q: params?.q,
      category: params?.category,
      page: params?.page || 1,
      limit: params?.limit || params?.pageSize || 50
    };
    const res = await apiClient.get('/foods', { params: p });
    const raw = res.data?.data;
    const foodsList: FoodItem[] = raw?.foods || [];
    return {
      foods: foodsList,
      items: foodsList,
      total: raw?.total || foodsList.length,
      page: raw?.page || 1,
      limit: raw?.limit || 50,
      totalPages: raw?.totalPages || 1
    };
  },

  async getFoodById(id: string): Promise<FoodItem> {
    const res = await apiClient.get(`/foods/${id}`);
    return res.data.data;
  },

  async createFood(payload: Partial<FoodItem>): Promise<FoodItem> {
    const res = await apiClient.post('/foods', payload);
    return res.data.data;
  },

  async importCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/foods/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
};
