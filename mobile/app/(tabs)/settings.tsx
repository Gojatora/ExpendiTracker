import * as Notifications from 'expo-notifications'
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';

import { useAuth } from '@/context/AuthContext';
import { getMe, updateRegion } from '@/api/auth';
import { getRegions } from '@/api/regions';

import { Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  requestNotificationPermission,
  scheduleReminder,
  cancelReminder,
  getReminderSettings,
} from '@/lib/reminders';

type Region = {
  region_id: number;
  region_name: string;
};

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadRegionData = useCallback(async () => {
    try {
      const [regionsData, meData] = await Promise.all([getRegions(), getMe()]);
      setRegions(regionsData);
      setSelectedRegionId(meData.region_id);
    } catch (err) {
      Alert.alert('Error', 'Could not load settings.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRegionData().finally(() => setLoading(false));
    }, [loadRegionData])
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

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Region</Text>
      <Text style={styles.hint}>
        Used to compare your spending against benchmarks for your area. If
        not set, comparisons use the national average instead.
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
      
      <Text style={styles.label}>Daily Reminder</Text>
      <Text style={styles.hint}>
        Get a daily nudge to log your expenses.
      </Text>
      <View style={styles.reminderRow}>
        <Text style={styles.reminderRowText}>Enable reminder</Text>
        <Switch value={reminderEnabled} onValueChange={handleToggleReminder} />
      </View>

      {reminderEnabled && (
        <Pressable style={styles.input} onPress={() => setShowTimePicker(true)}>
          <Text>
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
      
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', marginTop: 8 },
  hint: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 8 },
  pickerWrapper: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8 },
  saveButton: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  logoutButton: {
    backgroundColor: '#c0392b',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 40,
  },
  logoutButtonText: { color: '#fff', fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  reminderRowText: { fontSize: 14 },
});