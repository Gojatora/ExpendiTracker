import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline-expense-queue';

export async function getPendingExpenses() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addPendingExpense(expenseData) {
  const pending = await getPendingExpenses();
  const entry = {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    data: expenseData,
    createdAt: new Date().toISOString(),
  };
  pending.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(pending));
  return entry;
}

export async function removePendingExpense(localId) {
  const pending = await getPendingExpenses();
  const updated = pending.filter((entry) => entry.localId !== localId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}