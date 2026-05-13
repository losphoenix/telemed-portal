import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadStoredToken, restoreToken, setLoading } from '@/store/authSlice';

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const { token, isLoading } = useAppSelector((s) => s.auth);

  // Restore JWT from secure storage on launch
  useEffect(() => {
    (async () => {
      dispatch(setLoading(true));
      const stored = await loadStoredToken();
      if (stored) {
        dispatch(restoreToken(stored));
      } else {
        dispatch(setLoading(false));
      }
    })();
  }, [dispatch]);

  // Route guard: redirect based on auth state
  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    const inPatient = segments[0] === '(patient)';
    if (!token && !inAuth) {
      router.replace('/(auth)/sign-in');
    } else if (token && !inPatient) {
      router.replace('/(patient)/home');
    }
  }, [token, isLoading, segments, router]);

  if (isLoading) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGate>
      </SafeAreaProvider>
    </Provider>
  );
}
