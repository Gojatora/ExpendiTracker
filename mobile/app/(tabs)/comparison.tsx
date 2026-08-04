import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartesianChart, BarGroup } from 'victory-native';
import { matchFont } from '@shopify/react-native-skia';
import axios from 'axios';

import { getComparison } from '@/api/comparison';

type CategoryComparison = {
  category_id: number;
  category_name: string;
  user_spent: string | null;
  benchmark_avg: string | null;
  status: 'above' | 'below' | 'equal' | null;
};

const axisFont = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 11,
});

export default function ComparisonScreen() {
  const [categories, setCategories] = useState<CategoryComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const data = await getComparison();
      setCategories(data.categories);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Failed to load comparison data.');
      } else {
        setError('Something went wrong.');
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

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

  if (chartableCategories.length === 0) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyText}>
          No comparable data yet. Log some expenses this month to see your
          spending charted against regional benchmarks.
        </Text>
      </SafeAreaView>
    );
  }

  // Shorten long category names so x-axis labels don't overlap/crowd.
  const chartData = chartableCategories.map((c) => ({
    category: c.category_name.length > 8 ? c.category_name.slice(0, 7) + '…' : c.category_name,
    spent: parseFloat(c.user_spent!),
    benchmark: parseFloat(c.benchmark_avg!),
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
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

        {categories.some((c) => c.user_spent === null || c.benchmark_avg === null) && (
          <Text style={styles.noteText}>
            Some categories aren't shown above because they're missing either
            your spending data or regional benchmark data for this month.
          </Text>
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
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 12, color: '#666' },
  chartWrapper: { height: 300 },
  errorText: { color: '#c0392b', textAlign: 'center' },
  emptyText: { color: '#666', textAlign: 'center', fontSize: 14 },
  noteText: { color: '#999', fontSize: 12, marginTop: 12, textAlign: 'center' },
});