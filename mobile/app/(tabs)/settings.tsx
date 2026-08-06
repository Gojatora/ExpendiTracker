import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';

import { useAuth } from '@/context/AuthContext';
import { getMe, updateRegion } from '@/api/auth';
import { getRegions } from '@/api/regions';

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

  const loadData = useCallback(async () => {
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
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

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
});