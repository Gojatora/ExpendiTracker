import * as Notifications from 'expo-notifications';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';

import { useAuth } from '@/context/AuthContext';
import { getMe, setIncome, updateRegion } from '@/api/auth';
import { getRegions } from '@/api/regions';
import { getCategories } from '@/api/categories';
import { setMonthlyBudget, setCategoryBudget, getBudgetSummary } from '@/api/budget';
import { getComparison } from '@/api/comparison';
import {
  requestNotificationPermission,
  scheduleReminder,
  cancelReminder,
  getReminderSettings,
} from '@/lib/reminders';

const COLORS = {
  dark: '#292F36',
  yellow: '#FFB627',
  grayGreen: '#D7DEDC',
  red: '#FF6B6B',
  white: '#FFFFFF',
  muted: '#6b7280',
};

type Region = {
  region_id: number;
  region_name: string;
};

type SettingsTab = 'region' | 'budget' | 'notifications';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('region');

  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [categories, setCategories] = useState<{ category_id: number; category_name: string }[]>([]);
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState('');
  const [categoryBudgetInputs, setCategoryBudgetInputs] = useState<Record<number, string>>({});
  const [savingMonthlyBudget, setSavingMonthlyBudget] = useState(false);
  const [savingAllCategoryBudgets, setSavingAllCategoryBudgets] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);

  const loadSettingsData = useCallback(async () => {
    try {
      const [regionsData, meData, categoriesData, budgetSummary] = await Promise.all([
        getRegions(),
        getMe(),
        getCategories(),
        getBudgetSummary(),
      ]);
      setRegions(regionsData);
      setSelectedRegionId(meData.region_id);
      setCategories(categoriesData);

      setMonthlyBudgetInput(
        budgetSummary.monthly_budget !== null ? String(budgetSummary.monthly_budget) : ''
      );

      setMonthlyIncomeInput(meData.monthly_income !== null ? String(meData.monthly_income) : '');

      const prefill: Record<number, string> = {};
      for (const cat of budgetSummary.categories) {
        if (cat.category_budget !== null) {
          prefill[cat.category_id] = String(cat.category_budget);
        }
      }
      setCategoryBudgetInputs(prefill);
    } catch (err) {
      Alert.alert('Error', 'Could not load settings.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSettingsData().finally(() => setLoading(false));
    }, [loadSettingsData])
  );

  useEffect(() => {
    async function loadReminderSettings() {
      const reminderSettings = await getReminderSettings();
      setReminderEnabled(reminderSettings.enabled);
      const time = new Date();
      time.setHours(reminderSettings.hour, reminderSettings.minute, 0, 0);
      setReminderTime(time);
    }
    loadReminderSettings();
  }, []);

  const handleSaveRegion = async () => {
    setSaving(true);
    try {
      await updateRegion(selectedRegionId);
      Alert.alert('Saved', 'Your region has been updated.');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        Alert.alert('Error', err.response?.data?.detail ?? 'Failed to update region.');
      } else {
        Alert.alert('Error', 'Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMonthlyBudget = async () => {
    const parsed = parseFloat(monthlyBudgetInput);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('Invalid amount', 'Please enter a valid budget amount.');
      return;
    }
    setSavingMonthlyBudget(true);
    try {
      await setMonthlyBudget(parsed.toFixed(2));
      Alert.alert('Saved', 'Monthly budget updated.');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        Alert.alert('Error', err.response?.data?.detail ?? 'Failed to save budget.');
      } else {
        Alert.alert('Error', 'Something went wrong.');
      }
    } finally {
      setSavingMonthlyBudget(false);
    }
  };

  const handleAutofillFromBenchmark = async () => {
    setAutofilling(true);
    try {
      const selectedRegion = regions.find((r) => r.region_id === selectedRegionId);
      const comparisonData = await getComparison(selectedRegion?.region_name);

      setCategoryBudgetInputs((prev) => {
        const updated = { ...prev };
        for (const cat of comparisonData.categories) {
          const alreadyHasValue = updated[cat.category_id] && updated[cat.category_id].trim() !== '';
          if (!alreadyHasValue && cat.benchmark_avg !== null) {
            updated[cat.category_id] = String(cat.benchmark_avg);
          }
        }
        return updated;
      });

      Alert.alert('Autofilled', 'Empty category budgets filled with PSA benchmark values.');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        Alert.alert('Error', err.response?.data?.detail ?? 'Failed to load benchmark data.');
      } else {
        Alert.alert('Error', 'Something went wrong.');
      }
    } finally {
      setAutofilling(false);
    }
  };

  // Saves every category budget field that has a valid, non-empty value
  // in a single pass. Fields left blank are simply skipped, not cleared -
  // there's no "unset" action here, only "set" (matching what the backend
  // actually supports).
  const handleSaveAllCategoryBudgets = async () => {
    const entries = Object.entries(categoryBudgetInputs).filter(
      ([, value]) => value.trim() !== ''
    );

    if (entries.length === 0) {
      Alert.alert('Nothing to save', 'Enter at least one category budget first.');
      return;
    }

    for (const [categoryIdStr, value] of entries) {
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < 0) {
        const catName = categories.find((c) => c.category_id === Number(categoryIdStr))?.category_name ?? categoryIdStr;
        Alert.alert('Invalid amount', `"${catName}" has an invalid budget value.`);
        return;
      }
    }

    setSavingAllCategoryBudgets(true);
    try {
      let successCount = 0;
      const failedNames: string[] = [];

      for (const [categoryIdStr, value] of entries) {
        const categoryId = Number(categoryIdStr);
        try {
          await setCategoryBudget(categoryId, parseFloat(value).toFixed(2));
          successCount += 1;
        } catch (err) {
          const catName = categories.find((c) => c.category_id === categoryId)?.category_name ?? categoryIdStr;
          failedNames.push(catName);
        }
      }

      if (failedNames.length === 0) {
        Alert.alert('Saved', `${successCount} category budget${successCount > 1 ? 's' : ''} updated.`);
      } else {
        Alert.alert(
          'Some entries failed',
          `${successCount} saved. Failed: ${failedNames.join(', ')}.`
        );
      }
    } finally {
      setSavingAllCategoryBudgets(false);
    }
  };

  const handleToggleReminder = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Notification permission is required for reminders. Please enable it in your device settings.'
        );
        return;
      }
      await scheduleReminder(reminderTime.getHours(), reminderTime.getMinutes());
      setReminderEnabled(true);
    } else {
      await cancelReminder();
      setReminderEnabled(false);
    }
  };

  const handleTimeChange = async (_event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setReminderTime(selectedTime);
      if (reminderEnabled) {
        await scheduleReminder(selectedTime.getHours(), selectedTime.getMinutes());
      }
    }
  };

    const handleSaveIncome = async () => {
    const parsed = parseFloat(monthlyIncomeInput);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('Invalid amount', 'Please enter a valid income amount.');
      return;
    }
  setSavingIncome(true);
    try {
      await setIncome(parsed.toFixed(2));
      Alert.alert('Saved', 'Monthly income updated.');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        Alert.alert('Error', err.response?.data?.detail ?? 'Failed to save income.');
      } else {
        Alert.alert('Error', 'Something went wrong.');
      }
    } finally {
      setSavingIncome(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.tabRow}>
        {(['region', 'budget', 'notifications'] as SettingsTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
              {tab === 'region' ? 'Region' : tab === 'budget' ? 'Budget' : 'Notifications'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'region' && (
          <View style={styles.card}>
            <Text style={styles.label}>Region</Text>
            <Text style={styles.hint}>
              Used to compare your spending against benchmarks for your area.
              If not set, comparisons use the national average instead.
            </Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedRegionId}
                onValueChange={(value) => setSelectedRegionId(value)}
              >
                <Picker.Item label="Not set (use national average)" value={null} />
                {regions.map((region) => (
                  <Picker.Item
                    key={region.region_id}
                    label={region.region_name}
                    value={region.region_id}
                  />
                ))}
              </Picker>
            </View>
            <Pressable
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSaveRegion}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Region'}</Text>
            </Pressable>
          </View>
        )}

        {activeTab === 'budget' && (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>Monthly Income</Text>
              <Text style={styles.hint}>Used to calculate your savings rate on the Dashboard.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={monthlyIncomeInput}
                  onChangeText={setMonthlyIncomeInput}
                  placeholder="e.g. 25000.00"
                  keyboardType="decimal-pad"
                />
                <Pressable
                  style={[styles.saveButton, { paddingHorizontal: 16, marginTop: 0 }, savingIncome && styles.buttonDisabled]}
                  onPress={handleSaveIncome}
                  disabled={savingIncome}
                >
                  <Text style={styles.saveButtonText}>{savingIncome ? '...' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Monthly Budget</Text>
              <Text style={styles.hint}>Your overall spending target for the month.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={monthlyBudgetInput}
                  onChangeText={setMonthlyBudgetInput}
                  placeholder="e.g. 15000.00"
                  keyboardType="decimal-pad"
                />
                <Pressable
                  style={[styles.saveButton, { paddingHorizontal: 16, marginTop: 0 }, savingMonthlyBudget && styles.buttonDisabled]}
                  onPress={handleSaveMonthlyBudget}
                  disabled={savingMonthlyBudget}
                >
                  <Text style={styles.saveButtonText}>{savingMonthlyBudget ? '...' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Category Budgets</Text>
              <Text style={styles.hint}>Optional per-category spending caps.</Text>

              <Pressable
                style={[styles.autofillButton, autofilling && styles.buttonDisabled]}
                onPress={handleAutofillFromBenchmark}
                disabled={autofilling}
              >
                <Text style={styles.autofillButtonText}>
                  {autofilling ? 'Loading...' : 'Autofill from PSA Benchmark'}
                </Text>
              </Pressable>

              {categories.map((cat) => (
                <View key={cat.category_id} style={styles.categoryRow}>
                  <Text style={styles.categoryRowText}>{cat.category_name}</Text>
                  <TextInput
                    style={[styles.input, { width: 110, marginTop: 0 }]}
                    value={categoryBudgetInputs[cat.category_id] ?? ''}
                    onChangeText={(text) =>
                      setCategoryBudgetInputs((prev) => ({ ...prev, [cat.category_id]: text }))
                    }
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}

              <Pressable
                style={[styles.saveButton, savingAllCategoryBudgets && styles.buttonDisabled]}
                onPress={handleSaveAllCategoryBudgets}
                disabled={savingAllCategoryBudgets}
              >
                <Text style={styles.saveButtonText}>
                  {savingAllCategoryBudgets ? 'Saving...' : 'Save All Category Budgets'}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {activeTab === 'notifications' && (
          <View style={styles.card}>
            <Text style={styles.label}>Daily Reminder</Text>
            <Text style={styles.hint}>Get a daily nudge to log your expenses.</Text>

            <View style={styles.reminderRow}>
              <Text style={styles.reminderRowText}>Enable reminder</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: '#ccc', true: COLORS.yellow }}
                thumbColor={COLORS.white}
              />
            </View>

            {reminderEnabled && (
              <Pressable style={styles.input} onPress={() => setShowTimePicker(true)}>
                <Text style={{ color: COLORS.dark }}>
                  {reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
            )}

            {showTimePicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </View>
        )}

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },

  tabRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 15, elevation: 2, backgroundColor: COLORS.white },
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

  card: {
    backgroundColor: COLORS.grayGreen,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  label: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  hint: { fontSize: 12, color: COLORS.muted, marginTop: 4, marginBottom: 10 },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },

  saveButton: {
    backgroundColor: COLORS.dark,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  saveButtonText: { color: COLORS.white, fontWeight: '600' },

  autofillButton: {
    backgroundColor: COLORS.yellow,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  autofillButtonText: { color: COLORS.dark, fontWeight: '700' },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  categoryRowText: { flex: 1, fontSize: 13, color: COLORS.dark },

  logoutButton: {
    backgroundColor: COLORS.red,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: { color: COLORS.white, fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    backgroundColor: COLORS.white,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  reminderRowText: { fontSize: 14, color: COLORS.dark },
});
