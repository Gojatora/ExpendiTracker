import apiClient from './client';
import { setToken, clearToken } from './tokenStorage';

export async function register(email, password) {
  const response = await apiClient.post('/auth/register', { email, password });
  return response.data;
}

export async function login(email, password) {
  const response = await apiClient.post('/auth/login', { email, password });
  const { access_token } = response.data;
  await setToken(access_token);
  return response.data;
}

export async function logout() {
  await clearToken();
}