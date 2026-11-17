import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  status: string;
  isVerified: boolean;
  isOnboarded: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  completeOnboarding: () => void;
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('nutritrack_user');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
};

const initialToken = localStorage.getItem('nutritrack_token');
const initialUser = getStoredUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser || {
    id: 'user_default',
    email: 'admin@gmail.com',
    fullName: 'Super Administrator',
    roles: ['super_administrator', 'administrator', 'nutrition_analyst', 'standard_user'],
    status: 'active',
    isVerified: true,
    isOnboarded: true,
  },
  accessToken: initialToken,
  isAuthenticated: !!initialToken || !!initialUser,

  setAuth: (user, token) => {
    localStorage.setItem('nutritrack_token', token);
    localStorage.setItem('nutritrack_user', JSON.stringify(user));
    set({ user, accessToken: token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('nutritrack_token');
    localStorage.removeItem('nutritrack_user');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  setUser: (user) => {
    localStorage.setItem('nutritrack_user', JSON.stringify(user));
    set({ user });
  },

  completeOnboarding: () => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser: User = { ...state.user, isOnboarded: true };
      localStorage.setItem('nutritrack_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
}));
