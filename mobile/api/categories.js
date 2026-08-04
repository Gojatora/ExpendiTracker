import apiClient from './client';

export async function getCategories() {
  const response = await apiClient.get('/categories');
  return response.data;
}