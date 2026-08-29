import apiClient from './client';

export async function createExpense(expenseData) {
  const response = await apiClient.post('/expenses', expenseData);
  return response.data;
}

export async function getExpenses(filters = {}) {
  const response = await apiClient.get('/expenses', { params: filters });
  return response.data;
}

export async function updateExpense(expenseId, expenseData) {
  const response = await apiClient.put(`/expenses/${expenseId}`, expenseData);
  return response.data;
}

export async function deleteExpense(expenseId) {
  await apiClient.delete(`/expenses/${expenseId}`);
}