import apiClient from './client';

export async function getRegions() {
  const response = await apiClient.get('/regions');
  return response.data;
}