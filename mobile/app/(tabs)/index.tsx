import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

import { getComparison } from '@/api/comparison';
import { getExpenses } from '@/api/expenses';
import { getPendingExpenses } from '@/lib/offlineQueue';

type CategoryComparison = {
  category_id: number;
  category_name: string;
  user_spent: string | null;
  benchmark_avg: string | null;
  status: 'above' | 'below' | 'equal' | null;
};

type RecentExpenseItem = {
  key: string;
  expense_name: string;
  amount: string;
  expense_date: string;
  pending: boolean;
};

export default function HomeScreen() {
  const [categories, setCategories] = useState<CategoryComparison[]>([]);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);

    // Read the local pending queue independently - this must never be
    // blocked by a network failure, since it's local data that should
    // always be visible regardless of connectivity.
    const pendingExpenses = await getPendingExpenses();
    const pendingItems: RecentExpenseItem[] = pendingExpenses.map((entry: any) => ({
      key: entry.localId,
      expense_name: entry.data.expense_name,
      amount: entry.data.amount,
      expense_date: entry.data.expense_date,
      pending: true,
    }));

    try {
      const [comparisonData, syncedExpenses] = await Promise.all([
        getComparison(),
        getExpenses(),
      ]);

      setCategories(comparisonData.categories);
      setRegionName(comparisonData.region_name);

      const syncedItems: RecentExpenseItem[] = syncedExpenses
        .slice(0, 5)
        .map((e: any) => ({
          key: `synced-${e.expense_id}`,
          expense_name: e.expense_name,
          amount: e.amount,
          expense_date: e.expense_date,
          pending: false,
        }));

      setRecentExpenses([...pendingItems, ...syncedItems]);
    } catch (err) {
      // Network-dependent data failed to load (e.g. offline) - still
      // show whatever pending offline expenses exist, since those don't
      // depend on the network at all.
      setRecentExpenses(pendingItems);

      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Failed to load spending data.');
      } else {
        setError('Something went wrong.');
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>This Month's Spending</Text>
          <Text style={styles.subtitle}>
            {regionName ? `vs. ${regionName}` : 'vs. national average'}
          </Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {categories.map((item) => (
          <View key={item.category_id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.categoryName}>{item.category_name}</Text>
              {item.status && (
                <Text style={item.status === 'above' ? styles.badgeAbove : styles.badgeBelow}>
                  {item.status === 'above' ? '↑ Above' : item.status === 'below' ? '↓ Below' : '= Equal'}
                </Text>
              )}
            </View>
            <Text style={styles.amountText}>
              {item.user_spent ? `₱${item.user_spent}` : 'No spending yet'}
              {item.benchmark_avg ? `  ·  benchmark ₱${item.benchmark_avg}` : ''}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        {recentExpenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses logged yet.</Text>
        ) : (
          recentExpenses.map((item) => (
            <View key={item.key} style={styles.expenseRow}>
              <View style={styles.expenseRowLeft}>
                <Text style={styles.expenseName}>{item.expense_name}</Text>
                <Text style={styles.expenseDate}>{item.expense_date}</Text>
              </View>
              <View style={styles.expenseRowRight}>
                <Text style={styles.expenseAmount}>₱{item.amount}</Text>
                {item.pending && (
                  <Text style={styles.pendingBadge}>Pending sync</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },
  header: { marginBottom: 12, gap: 4 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#666' },
  errorText: { color: '#c0392b', paddingBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    gap: 4,
    marginBottom: 8,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryName: { fontSize: 16, fontWeight: '500' },
  amountText: { fontSize: 13, color: '#666' },
  badgeAbove: { color: '#c0392b', fontWeight: '600', fontSize: 12 },
  badgeBelow: { color: '#27ae60', fontWeight: '600', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  emptyText: { color: '#666', fontSize: 13 },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseRowLeft: { gap: 2 },
  expenseName: { fontSize: 14, fontWeight: '500' },
  expenseDate: { fontSize: 12, color: '#999' },
  expenseRowRight: { alignItems: 'flex-end', gap: 2 },
  expenseAmount: { fontSize: 14, fontWeight: '500' },
  pendingBadge: {
    fontSize: 10,
    color: '#e67e22',
    backgroundColor: '#fdf0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});