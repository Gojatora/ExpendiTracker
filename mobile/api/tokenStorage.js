import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';

export async function getToken() {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}