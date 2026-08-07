import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.geopop.com.br/api/v1/';
/**
 * Tenant do build. Vale **apenas** para as chamadas públicas (login, cadastro e
 * branding do tenant), que acontecem antes de existir sessão. Depois de autenticado
 * o header sai sempre do `TENANT_KEY` gravado no login — usar o tenant do build ali
 * faria um usuário logado consultar dados de outro tenant (docs 5.11 / TENA-01..09).
 */
const BUILD_TENANT = process.env.EXPO_PUBLIC_DEFAULT_TENANT ?? 'default';

export const TOKEN_KEY = 'geopop_token';
export const TENANT_KEY = 'geopop_tenant';
export const USER_KEY = 'geopop_user';

/** Erro lançado quando uma chamada autenticada não tem tenant vinculado à sessão. */
export class MissingTenantError extends Error {
  constructor() {
    super('Sessão sem organização vinculada. Entre novamente.');
    this.name = 'MissingTenantError';
  }
}

/** Instância pública: nunca envia Authorization e usa o tenant do build. */
export const publicApi = axios.create({ baseURL: API_URL });

publicApi.interceptors.request.use((config) => {
  config.headers['X-Tenant-Subdomain'] = BUILD_TENANT;
  // Chamada pública nunca leva credencial (AxiosHeaders: `delete` do objeto é no-op).
  config.headers.delete('Authorization');
  return config;
});

/** Instância autenticada: exige token **e** tenant gravados na sessão. */
export const api = axios.create({ baseURL: API_URL });

let unauthorizedHandler: (() => void | Promise<void>) | undefined;

export function setUnauthorizedHandler(handler: () => void | Promise<void>) {
  unauthorizedHandler = handler;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(TENANT_KEY);
}

/** Subdomínio da sessão; `null` quando não há sessão válida. Sem fallback de build. */
export async function getSessionTenant(): Promise<string | null> {
  const [token, tenant] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(TENANT_KEY),
  ]);
  return token && tenant ? tenant : null;
}

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const tenant = await SecureStore.getItemAsync(TENANT_KEY);

  // Sem tenant não existe requisição autenticada legítima: abortar em vez de cair
  // no tenant do build, o que consultaria dados de outra organização.
  if (!token || !tenant) {
    await clearSession();
    await unauthorizedHandler?.();
    throw new MissingTenantError();
  }

  config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Tenant-Subdomain'] = tenant;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearSession();
      await unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);
