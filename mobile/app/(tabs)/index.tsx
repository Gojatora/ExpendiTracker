import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';

import { getComparison } from '@/api/comparison';
import { getExpenses } from '@/api/expenses';
import { getPendingExpenses } from '@/lib/offlineQueue';
import { getBudgetSummary } from '@/api/budget';

const COLORS = {
  dark: '#292F36',
  yellow: '#FFB627',
  grayGreen: '#D7DEDC',
  red: '#FF6B6B',
  white: '#FFFFFF',
  greenGood: '#27ae60',
  muted: '#6b7280',
};

type CategoryComparison = {
  category_id: number;
  category_name: string;
  user_spent: string | null;
  benchmark_avg: string | null;
  status: 'above' | 'below' | 'equal' | null;
};

type RecentExpenseItem = {
  key: string;
  expense_id: number | null;
  expense_name: string;
  amount: string;
  expense_date: string; // ISO date string, e.g. "2026-08-12"
  category_id: number | null;
  category_name: string | null;
  pending: boolean;
};

type CategoryBudgetItem = {
  category_id: number;
  category_name: string;
  amount_spent: string;
  category_budget: string | null;
  over_budget: boolean;
};

type BudgetSummary = {
  total_spent: string;
  monthly_budget: string | null;
  budget_left: string | null;
  over_budget_categories: string[];
  categories: CategoryBudgetItem[];
};

const ALL_FILTER = 'all';

export default function HomeScreen() {
  const [categories, setCategories] = useState<CategoryComparison[]>([]);
  const [regionName, setRegionName] = useState<string | null>(null);

  // Full list backs the history modal; recentExpenses is just the top slice
  // shown on the home screen.
  const [allExpenses, setAllExpenses] = useState<RecentExpenseItem[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpenseItem[]>([]);

  const [budget, setBudget] = useState<BudgetSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [benchmarkModalVisible, setBenchmarkModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Filters for the history modal - "all" means no filter applied.
  const [monthFilter, setMonthFilter] = useState<string>(ALL_FILTER);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_FILTER);

  const fetchData = useCallback(async () => {
    setError(null);

    // Read the local pending queue independently - this must never be
    // blocked by a network failure, since it's local data that should
    // always be visible regardless of connectivity.
    const pendingExpenses = await getPendingExpenses();
    const pendingItems: RecentExpenseItem[] = pendingExpenses.map((entry: any) => ({
      key: entry.localId,
      expense_id: null,
      expense_name: entry.data.expense_name,
      amount: entry.data.amount,
      expense_date: entry.data.expense_date,
      category_id: entry.data.category_id ?? null,
      category_name: entry.data.category_name ?? null,
      pending: true,
    }));

    try {
      const [comparisonData, syncedExpenses, budgetData] = await Promise.all([
        getComparison(),
        getExpenses(),
        getBudgetSummary(),
      ]);
      setCategories(comparisonData.categories);
      setRegionName(comparisonData.region_name);
      setBudget(budgetData);

      const syncedItems: RecentExpenseItem[] = syncedExpenses.map((e: any) => ({
        key: `synced-${e.expense_id}`,
        expense_id: e.expense_id,
        expense_name: e.expense_name,
        amount: e.amount,
        expense_date: e.expense_date,
        category_id: e.category_id ?? null,
        category_name: e.category_name ?? null,
        pending: false,
      }));

      const combined = [...pendingItems, ...syncedItems];
      setAllExpenses(combined);
      setRecentExpenses(combined.slice(0, 5));
    } catch (err) {
      // Network-dependent data failed to load (e.g. offline) - still
      // show whatever pending offline expenses exist, since those don't
      // depend on the network at all.
      setAllExpenses(pendingItems);
      setRecentExpenses(pendingItems.slice(0, 5));

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

  // Options for the month/year dropdown, derived from whatever expenses
  // are loaded, newest first.
  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of allExpenses) {
      const d = new Date(item.expense_date);
      if (Number.isNaN(d.getTime())) continue;
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      seen.set(value, label);
    }
    return Array.from(seen.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([value, label]) => ({ value, label }));
  }, [allExpenses]);

  // Options for the category dropdown, derived from the comparison
  // categories (falls back to whatever shows up on expenses).
  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of categories) {
      seen.set(String(c.category_id), c.category_name);
    }
    for (const item of allExpenses) {
      if (item.category_id != null && item.category_name) {
        seen.set(String(item.category_id), item.category_name);
      }
    }
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [categories, allExpenses]);

  const filteredHistory = useMemo(() => {
    return allExpenses.filter((item) => {
      if (monthFilter !== ALL_FILTER) {
        const d = new Date(item.expense_date);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (value !== monthFilter) return false;
      }
      if (categoryFilter !== ALL_FILTER) {
        if (String(item.category_id) !== categoryFilter) return false;
      }
      return true;
    });
  }, [allExpenses, monthFilter, categoryFilter]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Total spending - tap to see the benchmark breakdown */}
        <TouchableOpacity
          style={styles.totalCard}
          activeOpacity={0.8}
          onPress={() => setBenchmarkModalVisible(true)}
        >
          <Text style={styles.totalLabel}>Total spending this month</Text>
          <Text style={styles.totalAmount}>
            ₱{budget?.total_spent ?? '0.00'}
          </Text>
        </TouchableOpacity>

        {budget?.monthly_budget != null && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCardNeutral}>
              <Text style={styles.summaryLabelMuted}>Budget left</Text>
              <Text style={styles.summaryValue}>
                ₱{budget.budget_left}
              </Text>
            </View>
            <View style={styles.summaryCardWarning}>
              <Text style={styles.summaryLabelWarning}>Over budget</Text>
              <Text style={styles.summaryValueWarning}>
                {budget.over_budget_categories.length > 0
                  ? budget.over_budget_categories[0]
                  : 'None'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Expense</Text>
          <TouchableOpacity onPress={() => setHistoryModalVisible(true)}>
            <Text style={styles.viewHistoryLink}>View History</Text>
          </TouchableOpacity>
        </View>

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

      {/* Benchmark comparison popup */}
      <Modal
        visible={benchmarkModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setBenchmarkModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBenchmarkModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>Total spending this month</Text>
                <Text style={styles.modalSubtitle}>
                  vs. {regionName ?? 'national average'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBenchmarkModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.benchmarkGrid}>
              {categories.map((item) => (
                <View key={item.category_id} style={styles.benchmarkCell}>
                  <Text style={styles.benchmarkCategoryName}>{item.category_name}</Text>
                  <View style={styles.benchmarkValueRow}>
                    <Text style={styles.benchmarkValueText}>
                      {item.user_spent ? `₱${item.user_spent}` : 'No Spending'}
                      {' | '}
                      {item.benchmark_avg ? `₱${item.benchmark_avg}` : '—'}
                    </Text>
                    {item.status && item.status !== 'equal' && (
                      <Text style={item.status === 'above' ? styles.badgeAbove : styles.badgeBelow}>
                        {item.status === 'above' ? '↑ Above' : '↓ Below'}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Spending history popup */}
      <Modal
        visible={historyModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setHistoryModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Spending History</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterByLabel}>Filter by:</Text>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <Text style={styles.filterFieldLabel}>Date</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={monthFilter}
                    onValueChange={(v) => setMonthFilter(String(v))}
                    style={styles.picker}
                  >
                    <Picker.Item label="None" value={ALL_FILTER} />
                    {monthOptions.map((opt) => (
                      <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterFieldLabel}>Category</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={categoryFilter}
                    onValueChange={(v) => setCategoryFilter(String(v))}
                    style={styles.picker}
                  >
                    <Picker.Item label="None" value={ALL_FILTER} />
                    {categoryOptions.map((opt) => (
                      <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <ScrollView style={styles.historyList}>
              {filteredHistory.length === 0 ? (
                <Text style={styles.emptyText}>No expenses match this filter.</Text>
              ) : (
                filteredHistory.map((item) => (
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
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1},
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },
  errorText: { color: COLORS.red, paddingBottom: 8 },

  totalCard: {
    backgroundColor: COLORS.grayGreen,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
    elevation: 5,
  },
  totalLabel: { fontSize: 15, color: COLORS.dark },
  totalAmount: { fontSize: 28, fontWeight: '700', color: COLORS.dark, marginTop: 6 },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCardNeutral: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 14,
    elevation: 5,
  },
  summaryCardWarning: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.red,
    padding: 14,
    elevation: 5,
  },
  summaryLabelMuted: { fontSize: 13, color: COLORS.muted },
  summaryLabelWarning: { fontSize: 13, color: COLORS.red },
  summaryValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 4 },
  summaryValueWarning: { fontSize: 18, fontWeight: '700', color: COLORS.red, marginTop: 4 },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.dark },
  viewHistoryLink: {
    color: COLORS.yellow,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  emptyText: { color: COLORS.muted, fontSize: 13 },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D7DEDC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  expenseRowLeft: { gap: 2 },
  expenseName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  expenseDate: { fontSize: 12, color: COLORS.muted },
  expenseRowRight: { alignItems: 'flex-end', gap: 2 },
  expenseAmount: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  pendingBadge: {
    fontSize: 10,
    color: '#e67e22',
    backgroundColor: '#fdf0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },

  badgeAbove: { color: COLORS.red, fontWeight: '700', fontSize: 12 },
  badgeBelow: { color: COLORS.greenGood, fontWeight: '700', fontSize: 12 },

  // Modal shared styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalHeaderTextWrap: {      // new
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    // removed flex: 1 and paddingRight from here
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  modalCloseIcon: { fontSize: 18, color: COLORS.red, fontWeight: '700', padding: 4 },

  // Benchmark modal
  benchmarkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  benchmarkCell: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 10,
    marginBottom: 4,
  },
  benchmarkCategoryName: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  benchmarkValueRow: { marginTop: 4, gap: 2 },
  benchmarkValueText: { fontSize: 12, color: COLORS.muted },

  // History modal filters
  filterByLabel: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 6 },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  filterField: { flex: 1 },
  filterFieldLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 2 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',   // added
    height: 52,                 // added — wrapper now drives the height
  },
  picker: {
    height: 52,                 // was 44
    color: COLORS.dark,         // added — Android default text color can render too light/clipped-looking
  },
  historyList: { marginTop: 4 },
});
