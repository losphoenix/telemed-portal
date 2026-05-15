import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadStoredToken, setCredentials, setLoading } from '@/store/authSlice';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') + '/api';

// Show notifications as banners even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerPushToken(patientId: string, authToken: string) {
  if (!Device.isDevice) return; // push doesn't work in simulators
  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing === 'granted'
    ? { status: existing }
    : await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('video_call', {
      name: 'Video Call',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { data: pushToken } = await Notifications.getExpoPushTokenAsync();
  await fetch(`${BASE_URL}/patient/${patientId}/push-token`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token: pushToken }),
  });
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const { token, patient, isLoading } = useAppSelector((s) => s.auth);

  // Restore JWT from secure storage on launch, then fetch full patient profile from DB
  useEffect(() => {
    (async () => {
      dispatch(setLoading(true));
      const stored = await loadStoredToken();
      if (!stored) {
        dispatch(setLoading(false));
        return;
      }
      try {
        // Decode the JWT to get the patient ID without an extra round-trip
        const payload = JSON.parse(atob(stored.split('.')[1]));
        if (payload.type !== 'patient' || !payload.id) {
          dispatch(setLoading(false));
          return;
        }

        // Fetch the full patient document directly — always returns DB fields
        // including policyAcceptance, firstName, lastName, etc.
        const res = await fetch(`${BASE_URL}/patient/${payload.id}`, {
          headers: { Authorization: `Bearer ${stored}` },
        });

        if (res.ok) {
          const raw = await res.json();
          const patient = {
            ...raw,
            _id: raw._id ?? raw.id,
            // Onboarding is complete when the patient has accepted the policy
            onboardingComplete: !!raw.policyAcceptance?.acceptedAt,
          };
          dispatch(setCredentials({ token: stored, patient }));
        } else {
          // Token expired or revoked
          dispatch(setLoading(false));
        }
      } catch {
        dispatch(setLoading(false));
      }
    })();
  }, [dispatch]);

  // Register Expo push token whenever the patient is authenticated
  useEffect(() => {
    if (token && patient?._id) {
      registerPushToken(patient._id, token).catch(() => {});
    }
  }, [token, patient?._id]);

  // Route guard: redirect based on auth state
  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    const inPatient = segments[0] === '(patient)';
    const inOnboarding = inAuth && (segments[1] === 'onboarding' || segments[1] === 'policy');

    if (!token && !inAuth) {
      router.replace('/(auth)/');
    } else if (token && !patient?.onboardingComplete && !inOnboarding) {
      router.replace({
        pathname: '/(auth)/onboarding',
        params: { patientId: patient?._id ?? '', email: patient?.email ?? '' },
      });
    } else if (token && patient?.onboardingComplete && !inPatient) {
      router.replace('/(patient)/home');
    }
  }, [token, patient?.onboardingComplete, isLoading, segments, router]);

  // Navigate to the join screen when the patient taps the "doctor is ready" notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.type === 'video_call' && data?.appointmentId) {
        router.push(`/(patient)/appointments/join?id=${data.appointmentId}`);
      }
    });
    return () => sub.remove();
  }, [router]);

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
