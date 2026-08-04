import apiClient from './client';

export async function getComparison(region) {
  const params = region ? { region } : {};
  const response = await apiClient.get('/comparison', { params });
  return response.data;
}