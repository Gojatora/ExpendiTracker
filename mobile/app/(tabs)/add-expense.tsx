import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';

import { getCategories } from '@/api/categories';
import { createExpense } from '@/api/expenses';

type Category = {
  category_id: number;
  category_name: string;
};

export default function AddExpenseScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
      if (data.length > 0) {
        setCategoryId(data[0].category_id);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load categories.');
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSubmit = async () => {
    if (!categoryId) {
      Alert.alert('Missing category', 'Please select a category.');
      return;
    }
    if (!expenseName.trim()) {
      Alert.alert('Missing name', 'Please enter an expense name.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      await createExpense({
        category_id: categoryId,
        expense_name: expenseName.trim(),
        amount: parsedAmount.toFixed(2),
        expense_date: date.toISOString().split('T')[0],
        note: note.trim() || null,
      });

      Alert.alert('Success', 'Expense logged.');
      setAmount('');
      setExpenseName('');
      setNote('');
      setDate(new Date());
    } catch (err) {
      if (axios.isAxiosError(err)) {
        Alert.alert('Error', err.response?.data?.detail ?? 'Failed to log expense.');
      } else {
        Alert.alert('Error', 'Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Add Expense</Text>

      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={categoryId} onValueChange={(value) => setCategoryId(value)}>
          {categories.map((cat) => (
            <Picker.Item key={cat.category_id} label={cat.category_name} value={cat.category_id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Expense name</Text>
      <TextInput
        style={styles.input}
        value={expenseName}
        onChangeText={setExpenseName}
        placeholder="e.g. Groceries"
      />

      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Date</Text>
      <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
        <Text>{date.toDateString()}</Text>
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

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="Optional note"
      />

      <Pressable
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>{submitting ? 'Saving...' : 'Save Expense'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 4 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: 13, color: '#666', marginTop: 8 },
  pickerWrapper: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontWeight: '600' },
});