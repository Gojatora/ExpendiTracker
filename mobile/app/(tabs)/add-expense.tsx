import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';

import { getCategories } from '@/api/categories';
import { createExpense } from '@/api/expenses';
import { isConnected } from '@/lib/connectivity';
import { addPendingExpense } from '@/lib/offlineQueue';

const COLORS = {
  dark: '#292F36',
  yellow: '#FFB627',
  grayGreen: '#D7DEDC',
  red: '#FF6B6B',
  white: '#FFFFFF',
  muted: '#6b7280',
};

type Category = {
  category_id: number;
  category_name: string;
};

type ExpenseEntry = {
  id: string;
  categoryId: number | null;
  expenseName: string;
  amount: string;
  note: string;
};

function createEntry(defaultCategoryId: number | null): ExpenseEntry {
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    categoryId: defaultCategoryId,
    expenseName: '',
    amount: '',
    note: '',
  };
}

export default function AddExpenseScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
      if (!initialized) {
        setEntries([createEntry(data[0]?.category_id ?? null)]);
        setInitialized(true);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load categories.');
    }
  }, [initialized]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const updateEntry = (id: string, changes: Partial<ExpenseEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  };

  const addEntry = () => {
    const lastCategoryId = entries[entries.length - 1]?.categoryId ?? categories[0]?.category_id ?? null;
    setEntries((prev) => [...prev, createEntry(lastCategoryId)]);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const runningTotal = entries.reduce((sum, e) => {
    const parsed = parseFloat(e.amount);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  const handleSaveAll = async () => {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.categoryId) {
        Alert.alert('Missing category', `Entry ${i + 1}: please select a category.`);
        return;
      }
      if (!entry.expenseName.trim()) {
        Alert.alert('Missing name', `Entry ${i + 1}: please enter an expense name.`);
        return;
      }
      const parsed = parseFloat(entry.amount);
      if (isNaN(parsed) || parsed <= 0) {
        Alert.alert('Invalid amount', `Entry ${i + 1}: please enter a valid amount greater than 0.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const online = await isConnected();
      let successCount = 0;
      const failedNames: string[] = [];

      for (const entry of entries) {
        const payload = {
          category_id: entry.categoryId,
          expense_name: entry.expenseName.trim(),
          amount: parseFloat(entry.amount).toFixed(2),
          expense_date: date.toISOString().split('T')[0],
          note: entry.note.trim() || null,
        };

        try {
          if (online) {
            await createExpense(payload);
          } else {
            await addPendingExpense(payload);
          }
          successCount += 1;
        } catch (err) {
          failedNames.push(entry.expenseName.trim());
        }
      }

      if (failedNames.length === 0) {
        Alert.alert(
          online ? 'Success' : 'Saved offline',
          online
            ? `${successCount} expense${successCount > 1 ? 's' : ''} logged.`
            : `${successCount} expense${successCount > 1 ? 's' : ''} saved offline. Will sync automatically once you're back online.`
        );
        setEntries([createEntry(categories[0]?.category_id ?? null)]);
        setDate(new Date());
      } else {
        Alert.alert(
          'Some entries failed',
          `${successCount} saved successfully. Failed: ${failedNames.join(', ')}. Please review and retry those entries.`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Date (applies to all entries below)</Text>
        <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.inputText}>{date.toDateString()}</Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {entries.map((entry, index) => (
          <View key={entry.id} style={styles.entryCard}>
            <View style={styles.entryHeaderRow}>
              <Text style={styles.entryTitle}>Expense {index + 1}</Text>
              {entries.length > 1 && (
                <Pressable onPress={() => removeEntry(entry.id)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {categories.map((cat) => {
                const selected = entry.categoryId === cat.category_id;
                return (
                  <Pressable
                    key={cat.category_id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => updateEntry(entry.id, { categoryId: cat.category_id })}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {cat.category_name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Expense name</Text>
            <TextInput
              style={styles.input}
              value={entry.expenseName}
              onChangeText={(text) => updateEntry(entry.id, { expenseName: text })}
              placeholder="e.g. Groceries"
            />

            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={entry.amount}
              onChangeText={(text) => updateEntry(entry.id, { amount: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              value={entry.note}
              onChangeText={(text) => updateEntry(entry.id, { note: text })}
              placeholder="Optional note"
            />
          </View>
        ))}

        <Pressable style={styles.addEntryButton} onPress={addEntry}>
          <Text style={styles.addEntryButtonText}>+ Add Another Expense</Text>
        </Pressable>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Batch Total</Text>
          <Text style={styles.totalValue}>₱{runningTotal.toFixed(2)}</Text>
        </View>

        <Pressable
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSaveAll}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Saving...' : `Save ${entries.length > 1 ? 'All' : 'Expense'}`}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },
  label: { fontSize: 13, color: COLORS.muted, marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  inputText: { color: COLORS.dark },
  entryCard: {
    backgroundColor: COLORS.grayGreen,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  entryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  removeText: { color: COLORS.red, fontSize: 13, fontWeight: '600' },
  chipRow: { marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: COLORS.white,
  },
  chipSelected: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  chipText: { fontSize: 13, color: COLORS.dark },
  chipTextSelected: { fontWeight: '700', color: COLORS.dark },
  addEntryButton: {
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  addEntryButtonText: { color: COLORS.yellow, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  totalValue: { fontSize: 22, fontWeight: '700', color: COLORS.dark },
  submitButton: {
    backgroundColor: COLORS.dark,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
});