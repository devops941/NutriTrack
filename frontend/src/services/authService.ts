import { apiClient } from './apiClient';

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload) {
    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  },

  async login(payload: LoginPayload) {
    const res = await apiClient.post('/auth/login', payload);
    return res.data;
  },

  async getMe() {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  async logout() {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },
};
