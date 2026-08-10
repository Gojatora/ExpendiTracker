import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, RefreshControl, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartesianChart, BarGroup } from 'victory-native';
import { matchFont } from '@shopify/react-native-skia';
import axios from 'axios';

import { getComparison, getMonthOverMonth } from '@/api/comparison';

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

export default function ComparisonScreen() {
  const [activeTab, setActiveTab] = useState<'benchmark' | 'previous'>('benchmark');

  const [categories, setCategories] = useState<CategoryComparison[]>([]);
  const [monthData, setMonthData] = useState<{
    current_month: string;
    previous_month: string;
    categories: MonthCategoryComparison[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [comparisonData, monthOverMonthData] = await Promise.all([
        getComparison(),
        getMonthOverMonth(),
      ]);
      setCategories(comparisonData.categories);
      setMonthData(monthOverMonthData);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Failed to load comparison data.');
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

  const chartData = chartableCategories.map((c) => ({
    category: c.category_name.length > 8 ? c.category_name.slice(0, 7) + '…' : c.category_name,
    spent: parseFloat(c.user_spent!),
    benchmark: parseFloat(c.benchmark_avg!),
  }));

  return (
    <SafeAreaView style={styles.container}>
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

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'benchmark' ? (
          <>
            <Text style={styles.title}>Spending vs. Benchmark</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#2c3e50' }]} />
                <Text style={styles.legendText}>You</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#bdc3c7' }]} />
                <Text style={styles.legendText}>Benchmark</Text>
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
                  yKeys={['spent', 'benchmark']}
                  domainPadding={{ left: 30, right: 30, top: 30 }}
                  axisOptions={{ font: axisFont }}
                >
                  {({ points, chartBounds }) => (
                    <BarGroup
                      chartBounds={chartBounds}
                      betweenGroupPadding={0.3}
                      withinGroupPadding={0.15}
                      roundedCorners={{ topLeft: 4, topRight: 4 }}
                    >
                      <BarGroup.Bar points={points.spent} color="#2c3e50" />
                      <BarGroup.Bar points={points.benchmark} color="#bdc3c7" />
                    </BarGroup>
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
            <Text style={styles.title}>
              {monthData?.previous_month} vs. {monthData?.current_month}
            </Text>

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
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  tabRow: { flexDirection: 'row', padding: 16, paddingBottom: 0, gap: 8 },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  tabButtonActive: { backgroundColor: '#2c3e50' },
  tabButtonText: { fontSize: 13, color: '#666', fontWeight: '500' },
  tabButtonTextActive: { color: '#fff' },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 12, color: '#666' },
  chartWrapper: { height: 300 },
  errorText: { color: '#c0392b', textAlign: 'center' },
  emptyText: { color: '#666', textAlign: 'center', fontSize: 14 },
  noteText: { color: '#999', fontSize: 12, marginTop: 12, textAlign: 'center' },
  categoryName: { fontSize: 15, fontWeight: '500', marginBottom: 6 },
  monthCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  monthAmount: { fontSize: 14, color: '#333' },
  monthArrow: { fontSize: 14, color: '#999' },
  percentUp: { fontSize: 13, fontWeight: '600', color: '#c0392b' },
  percentDown: { fontSize: 13, fontWeight: '600', color: '#27ae60' },
  percentSame: { fontSize: 13, fontWeight: '600', color: '#999' },
  percentNew: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2980b9',
    backgroundColor: '#eaf2f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});