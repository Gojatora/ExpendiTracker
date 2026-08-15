import apiClient from './client';

export async function setMonthlyBudget(amount) {
  const response = await apiClient.put('/budget/monthly', { amount });
  return response.data;
}

export async function setCategoryBudget(categoryId, amount) {
  const response = await apiClient.put(`/budget/categories/${categoryId}`, { amount });
  return response.data;
}

export async function getBudgetSummary() {
  const response = await apiClient.get('/budget/summary');
  return response.data;
}