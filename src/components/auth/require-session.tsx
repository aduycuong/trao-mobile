import { Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '@/hooks/useAuth';

/** Screens of the signed-in user (Kho đồ, Tin đăng): a guest who lands on one is sent to the sign-in gate. */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const { session, status } = useAuth();
  if (!session && (status === 'signedOut' || status === 'profileError')) {
    return <Redirect href="/auth-gate" />;
  }
  return <>{children}</>;
}
