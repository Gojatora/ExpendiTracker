import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

import { getComparison } from '@/api/comparison';

type CategoryComparison = {
  category_id: number;
  category_name: string;
  user_spent: string | null;
  benchmark_avg: string | null;
  status: 'above' | 'below' | 'equal' | null;
};

export default function HomeScreen() {
  const [categories, setCategories] = useState<CategoryComparison[]>([]);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const data = await getComparison();
      setCategories(data.categories);
      setRegionName(data.region_name);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Failed to load spending data.');
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>This Month's Spending</Text>
        <Text style={styles.subtitle}>
          {regionName ? `vs. ${regionName}` : 'vs. national average'}
        </Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={categories}
        keyExtractor={(item) => item.category_id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
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
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, gap: 4 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#666' },
  errorText: { color: '#c0392b', paddingHorizontal: 16, paddingBottom: 8 },
  list: { paddingHorizontal: 16, gap: 8 },
  card: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryName: { fontSize: 16, fontWeight: '500' },
  amountText: { fontSize: 13, color: '#666' },
  badgeAbove: { color: '#c0392b', fontWeight: '600', fontSize: 12 },
  badgeBelow: { color: '#27ae60', fontWeight: '600', fontSize: 12 },
});