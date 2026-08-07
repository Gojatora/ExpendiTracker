import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const REMINDER_ID = 'daily-expense-reminder';
const STORAGE_KEY = 'reminder-settings';

export async function requestNotificationPermission() {
  if (!Device.isDevice) {
    return false;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Daily Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function scheduleReminder(hour, minute) {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: 'ExpendiTracker',
      body: 'Have you logged your expenses yet?',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'daily-reminder',
    },
  });

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, hour, minute }));
}

export async function cancelReminder() {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  const existing = await getReminderSettings();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...existing, enabled: false })
  );
}

export async function getReminderSettings() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { enabled: false, hour: 20, minute: 0 }; // default: 8:00 PM
  }
  return JSON.parse(raw);
}