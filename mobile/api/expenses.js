import apiClient from './client';

export async function createExpense(expenseData) {
  const response = await apiClient.post('/expenses', expenseData);
  return response.data;
}