import axios from 'axios';

const AUTH_STORAGE_KEY = 'auth-session';
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function attachToken(config) {
  const session = localStorage.getItem(AUTH_STORAGE_KEY);
  if (session) {
    try {
      const { token } = JSON.parse(session);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (_err) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
  return config;
}

/**
 * Cria uma instância do Axios configurada para uma empresa específica.
 * @param {'vivi' | 'primicias'} empresa
 */
const createApi = (empresa) => {
  const api = axios.create({
    baseURL: `${API_BASE_URL}/api/${empresa}`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10_000,
  });
  api.interceptors.request.use(attachToken);
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        window.location.reload();
      }
      return Promise.reject(error);
    }
  );
  return api;
};

export const viviApi       = createApi('vivi');
export const primiciasApi = createApi('primicias');
export const authApi = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

/**
 * Retorna a instância de API correta para a empresa informada.
 * @param {'vivi' | 'primicias'} empresa
 */
export function getApi(empresa) {
  return empresa === 'vivi' ? viviApi : primiciasApi;
}
