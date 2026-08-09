import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './client';

const CATEGORIES_CACHE_KEY = 'cached-categories';

export async function getCategories() {
  try {
    const response = await apiClient.get('/categories');
    await AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(response.data));
    return response.data;
  } catch (err) {
    const cached = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    throw err; // no cache available either - let the caller handle it
  }
}