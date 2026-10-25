import { Linking } from 'react-native';

/** Terms and privacy live on the web app. */
export function openPolicies() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (baseUrl) Linking.openURL(`${baseUrl}/app/policies`).catch(() => {});
}
