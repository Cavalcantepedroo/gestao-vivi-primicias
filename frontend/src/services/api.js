import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function attachToken(config) {
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
    withCredentials: true,
    timeout: 10_000,
  });
  api.interceptors.request.use(attachToken);
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
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
  withCredentials: true,
  timeout: 10_000,
});

/**
 * Retorna a instância de API correta para a empresa informada.
 * @param {'vivi' | 'primicias'} empresa
 */
export function getApi(empresa) {
  return empresa === 'vivi' ? viviApi : primiciasApi;
}
