import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/theme';
import { useGetAppointmentQuery, useCancelAppointmentMutation } from '@/services/appointmentApi';
import { useGetVideoSessionByAppointmentQuery } from '@/services/videoSessionApi';
import { BookingConfirmationView } from './book';

const TEAL = '#1a7a6e';
const JOIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function useJoinWindow(scheduledAt?: string) {
  const [msUntil, setMsUntil] = useState<number>(Infinity);

  useEffect(() => {
    if (!scheduledAt) return;
    const apptTime = new Date(scheduledAt).getTime();

    const tick = () => setMsUntil(apptTime - Date.now());
    tick();
    const id = setInterval(tick, 10_000); // refresh every 10 s
    return () => clearInterval(id);
  }, [scheduledAt]);

  const canJoin = msUntil <= JOIN_WINDOW_MS;   // within 10 min (or past)
  const minutesUntil = Math.ceil(msUntil / 60_000);
  return { canJoin, minutesUntil };
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: appt, isLoading } = useGetAppointmentQuery(id ?? '');
  const [cancelAppt, { isLoading: isCancelling }] = useCancelAppointmentMutation();

  const isTelehealth = appt?.deliveryMode === 'telehealth';

  const { data: videoSession } = useGetVideoSessionByAppointmentQuery(id ?? '', {
    skip: !id || !isTelehealth,
    pollingInterval: 15_000, // poll so the button activates once the doctor creates the room
  });

  const { canJoin } = useJoinWindow(appt?.scheduledAt);

  const handleCancel = () => {
    const hoursUntil = appt
      ? (new Date(appt.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60)
      : Infinity;

    if (hoursUntil < 24) {
      // Within the 24-hour window — warn about the late-cancel / no-show charge
      Alert.alert(
        'Late Cancellation Fee',
        'Your appointment is less than 24 hours away. Cancelling now may result in a no-show charge.\n\nDo you still want to cancel?',
        [
          { text: 'Keep Appointment', style: 'cancel' },
          {
            text: 'Cancel Anyway',
            style: 'destructive',
            onPress: async () => {
              try {
                await cancelAppt({ id: id ?? '', reason: 'Late cancellation (within 24 h)' }).unwrap();
                router.back();
              } catch {
                Alert.alert('Error', 'Could not cancel appointment. Please try again.');
              }
            },
          },
        ],
      );
    } else {
      Alert.alert(
        'Cancel Appointment',
        'Are you sure you want to cancel this appointment?',
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Appointment',
            style: 'destructive',
            onPress: async () => {
              try {
                await cancelAppt({ id: id ?? '' }).unwrap();
                router.back();
              } catch {
                Alert.alert('Error', 'Could not cancel appointment. Please try again.');
              }
            },
          },
        ],
      );
    }
  };

  const handleJoin = () => {
    if (!videoSession) {
      Alert.alert(
        'Not ready yet',
        'Your doctor hasn\'t opened the video room yet. You\'ll get a notification when they\'re ready.',
      );
      return;
    }
    if (!canJoin) {
      const scheduled = new Date(appt!.scheduledAt).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
      });
      Alert.alert(
        'Too early to join',
        `Your visit starts at ${scheduled}. You can join up to 10 minutes before.`,
      );
      return;
    }
    router.push(`/(patient)/appointments/join?id=${id}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }

  if (!appt) return null;

  const canCancel = ['pending', 'confirmed'].includes(appt.status?.toLowerCase());
  const doctorName = (appt.doctorId as any)?.name ?? 'Your provider';
  const serviceName = (appt.serviceId as any)?.name ?? 'Visit';
  const duration = appt.duration ?? (appt.serviceId as any)?.defaultDuration ?? 30;

  // Join button: only shown for telehealth with an active video session.
  // Disabled until within the 10-min window; no countdown in the label.
  const joinReady = isTelehealth && !!videoSession && canJoin;
  const showJoin = isTelehealth && !!videoSession;

  const joinButtonEl = showJoin ? (
    <TouchableOpacity
      style={[styles.joinBtn, !joinReady && styles.joinBtnDisabled]}
      onPress={handleJoin}
      activeOpacity={0.8}
    >
      <Ionicons name="videocam" size={20} color={colors.white} style={{ marginRight: spacing.sm }} />
      <Text style={styles.joinBtnText}>Join Call</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <BookingConfirmationView
        serviceName={serviceName}
        duration={duration}
        scheduledAt={appt.scheduledAt}
        doctorName={doctorName}
        deliveryMode={appt.deliveryMode}
        notes={appt.notes}
        onDone={() => router.back()}
        onCancel={handleCancel}
        canCancel={canCancel}
        isCancelling={isCancelling}
        joinButton={joinButtonEl}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TEAL,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700', color: colors.white, letterSpacing: 0.2,
  },

  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
  },
  joinBtnDisabled: {
    backgroundColor: colors.gray400,
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
