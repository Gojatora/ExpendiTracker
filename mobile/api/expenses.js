import apiClient from './client';

export async function createExpense(expenseData) {
  const response = await apiClient.post('/expenses', expenseData);
  return response.data;
}

export async function getExpenses(filters = {}) {
  const response = await apiClient.get('/expenses', { params: filters });
  return response.data;
}