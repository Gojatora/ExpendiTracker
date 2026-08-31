import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, RefreshControl, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartesianChart, Bar, Line } from 'victory-native';
import { matchFont } from '@shopify/react-native-skia';
import axios from 'axios';

import { getComparison, getMonthOverMonth, getYearlyTrend } from '@/api/comparison';
import { getBudgetSummary } from '@/api/budget';
import { getMe } from '@/api/auth';

const COLORS = {
  dark: '#292F36',
  yellow: '#FFB627',
  grayGreen: '#D7DEDC',
  red: '#FF6B6B',
  white: '#FFFFFF',
  greenGood: '#27ae60',
  muted: '#6b7280',
};

// TODO: monthly_income exists as a column on User (unused since Sprint 2,
// no endpoint or UI ever wired it up). Savings Rate is a placeholder until
// a real "set monthly income" feature is built - same shape decision as
// monthly_budget before the budget tracking ticket. Replace
// PLACEHOLDER_INCOME with a real fetched value once that exists.
const PLACEHOLDER_INCOME = 25000;

// TODO: no backend endpoint exists yet for monthly spending totals across
// a year - GET /expenses returns individual rows, not aggregates. This
// needs a real SQL-aggregated endpoint (same GROUP BY pattern as
// ComparisonService/BudgetService) before this chart can show real data.
// Placeholder values below are illustrative only.
const PLACEHOLDER_YEARLY_TREND = [
  { month: 'Sep', total: 18500 },
  { month: 'Oct', total: 21200 },
  { month: 'Nov', total: 19800 },
  { month: 'Dec', total: 26400 },
  { month: 'Jan', total: 22100 },
  { month: 'Feb', total: 20300 },
  { month: 'Mar', total: 23700 },
  { month: 'Apr', total: 19900 },
  { month: 'May', total: 21500 },
  { month: 'Jun', total: 24800 },
  { month: 'Jul', total: 22900 },
  { month: 'Aug', total: 25100 },
];

type CategoryComparison = {
  category_id: number;
  category_name: string;
  user_spent: string | null;
  benchmark_avg: string | null;
  status: 'above' | 'below' | 'equal' | null;
};

type MonthCategoryComparison = {
  category_id: number;
  category_name: string;
  current_month_spend: string;
  previous_month_spend: string;
  percent_change: string | null;
};

const axisFont = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 11,
});

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState<'benchmark' | 'previous'>('benchmark');

  const [categories, setCategories] = useState<CategoryComparison[]>([]);
  const [monthData, setMonthData] = useState<{
    current_month: string;
    previous_month: string;
    categories: MonthCategoryComparison[];
  } | null>(null);
  const [totalSpent, setTotalSpent] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [comparisonData, monthOverMonthData, budgetData, trendData, meData] = await Promise.all([
        getComparison(),
        getMonthOverMonth(),
        getBudgetSummary(),
        getYearlyTrend(),
        getMe(),
      ]);
      setCategories(comparisonData.categories);
      setMonthData(monthOverMonthData);
      setTotalSpent(parseFloat(budgetData.total_spent));
      setYearlyTrend(trendData);
      setMonthlyIncome(meData.monthly_income !== null ? parseFloat(meData.monthly_income) : null);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Failed to load dashboard data.');
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

  // --- KPI computations, all derived from data already fetched above ---

  const avgDailySpend = useMemo(() => {
    const daysElapsed = new Date().getDate(); // e.g. 15 if today is the 15th
    return totalSpent / daysElapsed;
  }, [totalSpent]);

  const projectedMonthEndTotal = useMemo(() => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return avgDailySpend * daysInMonth;
  }, [avgDailySpend]);

  const topCategory = useMemo(() => {
    let best: { name: string; amount: number } | null = null;
    for (const c of categories) {
      if (c.user_spent === null) continue;
      const amount = parseFloat(c.user_spent);
      if (!best || amount > best.amount) {
        best = { name: c.category_name, amount };
      }
    }
    return best;
  }, [categories]);

  const biggestMover = useMemo(() => {
    if (!monthData) return null;
    let best: { name: string; percent: number } | null = null;
    for (const c of monthData.categories) {
      if (c.percent_change === null) continue;
      const percent = parseFloat(c.percent_change);
      if (!best || Math.abs(percent) > Math.abs(best.percent)) {
        best = { name: c.category_name, percent };
      }
    }
    return best;
  }, [monthData]);

  const savingsRate = useMemo(() => {
    if (monthlyIncome === null) return null;
    const savings = monthlyIncome - totalSpent;
    return (savings / monthlyIncome) * 100;
  }, [monthlyIncome, totalSpent]);

    const [yearlyTrend, setYearlyTrend] = useState<{ month: string; total: string }[]>([]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  const chartableCategories = categories.filter(
    (c) => c.user_spent !== null && c.benchmark_avg !== null
  );

  const chartData = chartableCategories.map((c) => {
  const spent = parseFloat(c.user_spent!);
  const benchmark = parseFloat(c.benchmark_avg!);
  const percent = benchmark > 0 ? (spent / benchmark) * 100 : 0;
  return {
    category: c.category_name.length > 8 ? c.category_name.slice(0, 7) + '…' : c.category_name,
    overValue: percent > 100 ? percent : 0,
    underValue: percent <= 100 ? percent : 0,
  };
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >

        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Avg Daily Spend</Text>
            <Text style={styles.kpiValue}>₱{avgDailySpend.toFixed(2)}</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Projected Month-End</Text>
            <Text style={styles.kpiValue}>₱{projectedMonthEndTotal.toFixed(2)}</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Top Category</Text>
            <Text style={styles.kpiValue}>
              {topCategory ? topCategory.name : '—'}
            </Text>
            {topCategory && (
              <Text style={styles.kpiSubtext}>₱{topCategory.amount.toFixed(2)}</Text>
            )}
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Biggest Mover</Text>
            <Text style={styles.kpiValue}>
              {biggestMover ? biggestMover.name : '—'}
            </Text>
            {biggestMover && (
              <Text style={biggestMover.percent >= 0 ? styles.kpiSubtextUp : styles.kpiSubtextDown}>
                {biggestMover.percent >= 0 ? '+' : ''}
                {biggestMover.percent.toFixed(2)}%
              </Text>
            )}
          </View>

          <View style={[styles.kpiCard, { width: '100%' }]}>
            <Text style={styles.kpiLabel}>Savings Rate</Text>
            {savingsRate !== null ? (
              <Text style={savingsRate >= 0 ? styles.kpiValueGood : styles.kpiValueBad}>
                {savingsRate.toFixed(1)}%
              </Text>
            ) : (
              <Text style={styles.kpiSubtext}>Set your monthly income in Settings to see this.</Text>
            )}
          </View>
        </View>

        <Text style={styles.sectionHeading}>
          Spending Trend (Last 12 Months)
        </Text>
        <View style={styles.chartWrapperSmall}>
          <CartesianChart
            data={yearlyTrend.map((t) => {
              const [year, month] = t.month.split('-');
              const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
              return { month: label, total: parseFloat(t.total) };
            })}
            xKey="month"
            yKeys={['total']}
            domainPadding={{ left: 20, right: 20, top: 20, bottom: 10 }}
            axisOptions={{ font: axisFont }}
          >
            {({ points }) => (
              <Line
                points={points.total}
                color={COLORS.yellow}
                strokeWidth={3}
                curveType="natural"
              />
            )}
          </CartesianChart>
        </View>

        {/* Existing benchmark / previous-month comparison */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabButton, activeTab === 'benchmark' && styles.tabButtonActive]}
            onPress={() => setActiveTab('benchmark')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'benchmark' && styles.tabButtonTextActive]}>
              vs. Benchmark
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'previous' && styles.tabButtonActive]}
            onPress={() => setActiveTab('previous')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'previous' && styles.tabButtonTextActive]}>
              vs. Previous Month
            </Text>
          </Pressable>
        </View>

        {activeTab === 'benchmark' ? (
          <>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: COLORS.red }]} />
                <Text style={styles.legendText}>Over 100% of benchmark</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: COLORS.greenGood }]} />
                <Text style={styles.legendText}>At or under</Text>
              </View>
            </View>

            {chartableCategories.length === 0 ? (
              <Text style={styles.emptyText}>
                No comparable data yet. Log some expenses this month to see
                your spending charted against regional benchmarks.
              </Text>
            ) : (
              <View style={styles.chartWrapper}>
                                <CartesianChart
                  data={chartData}
                  xKey="category"
                  yKeys={['overValue', 'underValue']}
                  domainPadding={{ left: 30, right: 30, top: 30 }}
                  axisOptions={{ font: axisFont, formatYLabel: (v) => `${v}%` }}
                >
                  {({ points, chartBounds }) => (
                    <>
                      <Bar
                        points={points.overValue}
                        chartBounds={chartBounds}
                        color={COLORS.red}
                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                      />
                      <Bar
                        points={points.underValue}
                        chartBounds={chartBounds}
                        color={COLORS.greenGood}
                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                      />
                    </>
                  )}
                </CartesianChart>
              </View>
            )}

            {categories.some((c) => c.user_spent === null || c.benchmark_avg === null) && (
              <Text style={styles.noteText}>
                Some categories aren't shown above because they're missing
                either your spending data or regional benchmark data for
                this month.
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.subheading}>
              {monthData?.previous_month} vs. {monthData?.current_month}
            </Text>
              {monthData && monthData.categories.some((c) => c.percent_change !== null) && (
              <View style={styles.chartWrapperSmall}>
                <CartesianChart
                  data={monthData.categories
                    .filter((c) => c.percent_change !== null)
                    .map((c) => {
                      const change = parseFloat(c.percent_change!);
                      return {
                        category: c.category_name.length > 8 ? c.category_name.slice(0, 7) + '…' : c.category_name,
                        increase: change > 0 ? change : 0,
                        decrease: change <= 0 ? change : 0,
                      };
                    })}
                  xKey="category"
                  yKeys={['increase', 'decrease']}
                  domainPadding={{ left: 30, right: 30, top: 20, bottom: 20 }}
                  axisOptions={{ font: axisFont, formatYLabel: (v) => `${v}%` }}
                >
                  {({ points, chartBounds }) => (
                    <>
                      <Bar
                        points={points.increase}
                        chartBounds={chartBounds}
                        color={COLORS.red}
                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                      />
                      <Bar
                        points={points.decrease}
                        chartBounds={chartBounds}
                        color={COLORS.greenGood}
                        roundedCorners={{ bottomLeft: 4, bottomRight: 4 }}
                      />
                    </>
                  )}
                </CartesianChart>
              </View>
            )}
            {!monthData || monthData.categories.length === 0 ? (
              <Text style={styles.emptyText}>No spending data yet to compare.</Text>
            ) : (
              monthData.categories.map((item) => (
                <View key={item.category_id} style={styles.monthCard}>
                  <Text style={styles.categoryName}>{item.category_name}</Text>
                  <View style={styles.monthRow}>
                    <Text style={styles.monthAmount}>₱{item.previous_month_spend}</Text>
                    <Text style={styles.monthArrow}>→</Text>
                    <Text style={styles.monthAmount}>₱{item.current_month_spend}</Text>
                    {item.percent_change !== null ? (
                      <Text
                        style={
                          parseFloat(item.percent_change) > 0
                            ? styles.percentUp
                            : parseFloat(item.percent_change) < 0
                            ? styles.percentDown
                            : styles.percentSame
                        }
                      >
                        {parseFloat(item.percent_change) > 0 ? '+' : ''}
                        {item.percent_change}%
                      </Text>
                    ) : (
                      <Text style={styles.percentNew}>New</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.grayGreen,
    borderRadius: 14,
    padding: 12,
  },
  kpiLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  kpiValue: { fontSize: 17, fontWeight: '700', color: COLORS.dark, marginTop: 4 },
  kpiValueGood: { fontSize: 20, fontWeight: '700', color: COLORS.greenGood, marginTop: 4 },
  kpiValueBad: { fontSize: 20, fontWeight: '700', color: COLORS.red, marginTop: 4 },
  kpiSubtext: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  kpiSubtextUp: { fontSize: 12, fontWeight: '600', color: COLORS.red, marginTop: 2 },
  kpiSubtextDown: { fontSize: 12, fontWeight: '600', color: COLORS.greenGood, marginTop: 2 },
  placeholderTag: { fontSize: 10, color: COLORS.muted, fontWeight: '400', fontStyle: 'italic' },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  tabButtonActive: { backgroundColor: COLORS.dark },
  tabButtonText: { fontSize: 13, color: '#666', fontWeight: '500' },
  tabButtonTextActive: { color: COLORS.white },

  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 12, color: COLORS.muted },
  chartWrapper: { height: 300 },
  errorText: { color: COLORS.red, textAlign: 'center' },
  emptyText: { color: COLORS.muted, textAlign: 'center', fontSize: 14 },
  noteText: { color: COLORS.muted, fontSize: 12, marginTop: 12, textAlign: 'center' },

  subheading: { fontSize: 15, fontWeight: '600', color: COLORS.dark, marginBottom: 10 },
  categoryName: { fontSize: 15, fontWeight: '600', color: COLORS.dark, marginBottom: 6 },
  monthCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  monthAmount: { fontSize: 14, color: COLORS.dark },
  monthArrow: { fontSize: 14, color: COLORS.muted },
  percentUp: { fontSize: 13, fontWeight: '700', color: COLORS.red },
  percentDown: { fontSize: 13, fontWeight: '700', color: COLORS.greenGood },
  percentSame: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  percentNew: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2980b9',
    backgroundColor: '#eaf2f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chartWrapperSmall: { height: 220, marginBottom: 16 },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: COLORS.dark, marginTop: 4, marginBottom: 8 },
});
