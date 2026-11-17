import { apiClient } from './apiClient';

export interface LabelUploadResponse {
  labelId: string;
  fileRef: string;
  originalFilename: string;
  status: string;
}

export interface ExtractedField {
  field: string;
  rawMatch?: string;
  value?: number;
  unit: string;
  confidence: number;
  reviewStatus: string;
}

export interface LabelExtractResponse {
  labelId: string;
  engine: string;
  isFallback: boolean;
  candidateName: string;
  servingBasis: { amount: number; unit: string };
  fields: ExtractedField[];
  nutrients: {
    energyKcal?: number;
    proteinG?: number;
    carbohydrateG?: number;
    fatG?: number;
    fiberG?: number;
    sugarsG?: number;
    sodiumMg?: number;
  };
  rawText: string;
}

export interface LabelReviewPayload {
  labelId: string;
  foodName: string;
  brand?: string;
  categoryId?: string;
  nutrients: any;
  basis: { amount: number; unit: string };
  action: 'save_to_foods' | 'mark_reviewed';
  notes?: string;
}

export const labelService = {
  async uploadLabel(file: File): Promise<LabelUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/labels/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async extractLabel(labelId: string): Promise<LabelExtractResponse> {
    const res = await apiClient.post(`/labels/${labelId}/extract`);
    return res.data.data;
  },

  async reviewLabel(labelId: string, payload: LabelReviewPayload) {
    const res = await apiClient.patch(`/labels/${labelId}/review`, payload);
    return res.data.data;
  },

  async getLabelDetails(labelId: string) {
    const res = await apiClient.get(`/labels/${labelId}`);
    return res.data.data;
  },
};
