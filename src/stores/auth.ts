import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { setUnauthorizedHandler, TOKEN_KEY, TENANT_KEY, USER_KEY } from '../services/api';
import type { LoginResult } from '../types';

interface AuthState {
  user: LoginResult | null;
  isAuthenticated: boolean;
  signIn: (data: LoginResult) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  signIn: async (data) => {
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data));
    if (data.subdominio) {
      await SecureStore.setItemAsync(TENANT_KEY, data.subdominio);
    }
    set({ user: data, isAuthenticated: true });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(TENANT_KEY);
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (raw) {
      const user = JSON.parse(raw) as LoginResult;
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) set({ user, isAuthenticated: true });
    }
  },
}));

setUnauthorizedHandler(() => useAuthStore.setState({ user: null, isAuthenticated: false }));
