import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { clearSession, setUnauthorizedHandler, TOKEN_KEY, TENANT_KEY, USER_KEY } from '../services/api';
import type { LoginResult } from '../types';

/** Mensagem mostrada quando o login não identifica o tenant do usuário. */
export const TENANT_AUSENTE_MSG =
  'Não foi possível identificar a organização vinculada à sua conta. Fale com o suporte.';

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
    // Login sem subdomínio é falha de autenticação: sem tenant o app não tem como
    // saber a que organização a sessão pertence e passaria a usar o tenant do build.
    const tenant = data.subdominio?.trim();
    if (!tenant) {
      await clearSession();
      set({ user: null, isAuthenticated: false });
      throw new Error(TENANT_AUSENTE_MSG);
    }
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data));
    await SecureStore.setItemAsync(TENANT_KEY, tenant);
    set({ user: data, isAuthenticated: true });
  },

  signOut: async () => {
    await clearSession();
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return;
    const user = JSON.parse(raw) as LoginResult;
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const tenant = await SecureStore.getItemAsync(TENANT_KEY);
    // Sessão sem tenant (ou divergente do usuário gravado) é descartada em vez de
    // reaproveitada — senão as chamadas seguintes cairiam no tenant do build.
    if (!token || !tenant || (user.subdominio && user.subdominio.trim() !== tenant)) {
      await clearSession();
      return;
    }
    set({ user, isAuthenticated: true });
  },
}));

setUnauthorizedHandler(() => useAuthStore.setState({ user: null, isAuthenticated: false }));
