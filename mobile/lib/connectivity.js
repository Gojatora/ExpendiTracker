import NetInfo from '@react-native-community/netinfo';

export async function isConnected() {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable !== false);
}

export function subscribeToConnectivityChanges(onConnected) {
  let wasConnected = null;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const nowConnected = !!(state.isConnected && state.isInternetReachable !== false);

    if (nowConnected && wasConnected === false) {
      onConnected();
    }

    wasConnected = nowConnected;
  });

  return unsubscribe;
}