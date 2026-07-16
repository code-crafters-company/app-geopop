import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.geopop.com.br/api/v1/';
const DEFAULT_TENANT = process.env.EXPO_PUBLIC_DEFAULT_TENANT ?? 'default';

export const TOKEN_KEY = 'geopop_token';
export const TENANT_KEY = 'geopop_tenant';
export const USER_KEY = 'geopop_user';

export const api = axios.create({ baseURL: API_URL });
let unauthorizedHandler: (() => void | Promise<void>) | undefined;

export function setUnauthorizedHandler(handler: () => void | Promise<void>) {
  unauthorizedHandler = handler;
}

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const tenant = await SecureStore.getItemAsync(TENANT_KEY);
  config.headers['X-Tenant-Subdomain'] = tenant ?? DEFAULT_TENANT;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error?.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(TENANT_KEY);
      await unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);
