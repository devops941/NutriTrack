import { apiClient } from './apiClient';

export interface ProfileData {
  id?: string;
  userId?: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  activityLevel: string;
  dietaryPreferences: string[];
  allergies: string[];
  excludedIngredients: string[];
  preferredUnits: string;
  dailyCalorieGoal?: number;
  updatedAt?: string;
}

export interface DietaryOption {
  id: string;
  label: string;
}

export const DIETARY_OPTIONS: DietaryOption[] = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'eggetarian', label: 'Eggetarian' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'low-carb', label: 'Low-Carb' },
  { id: 'dairy-free', label: 'Dairy-Free' },
];

export const COMMON_ALLERGENS: string[] = [
  'Peanuts',
  'Tree Nuts',
  'Cow Milk / Dairy',
  'Soybeans',
  'Wheat / Gluten',
  'Eggs',
  'Fish',
  'Shellfish',
  'Sesame',
  'Mustard',
];

export const isDietaryOptionActive = (opt: DietaryOption | string, selectedList: string[] = []): boolean => {
  if (!selectedList || selectedList.length === 0) return false;
  const optId = typeof opt === 'string' ? opt.toLowerCase() : opt.id.toLowerCase();
  const optLabel = typeof opt === 'string' ? opt.toLowerCase() : opt.label.toLowerCase();
  return selectedList.some((item) => {
    if (!item) return false;
    const it = item.toLowerCase();
    return it === optId || it === optLabel;
  });
};

export const isAllergenActive = (allergen: string, selectedList: string[] = []): boolean => {
  if (!selectedList || selectedList.length === 0) return false;
  const norm = allergen.toLowerCase();
  return selectedList.some((item) => {
    if (!item) return false;
    const it = item.toLowerCase();
    if (it === norm) return true;
    if (norm === 'cow milk / dairy' && (it === 'dairy' || it === 'cow milk' || it === 'cow milk / dairy' || it === 'milk')) return true;
    if (norm === 'wheat / gluten' && (it === 'gluten' || it === 'wheat' || it === 'wheat / gluten')) return true;
    if (norm === 'soybeans' && (it === 'soy' || it === 'soybeans')) return true;
    return false;
  });
};

export const profileService = {
  async getProfile(): Promise<ProfileData> {
    const res = await apiClient.get('/profiles/me');
    return res.data.data;
  },

  async updateProfile(payload: Partial<ProfileData>): Promise<ProfileData> {
    const res = await apiClient.put('/profiles/me', payload);
    return res.data.data;
  },
};
