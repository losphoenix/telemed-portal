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
import {
  useGetAppointmentIntakeFormsQuery,
  useCreateIntakeFormMutation,
} from '@/services/intakeFormApi';
import { useAppSelector } from '@/store/hooks';
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
  const { patient } = useAppSelector((s) => s.auth);

  const { data: appt, isLoading } = useGetAppointmentQuery(id ?? '');
  const [cancelAppt, { isLoading: isCancelling }] = useCancelAppointmentMutation();

  const { data: intakeForms } = useGetAppointmentIntakeFormsQuery(id ?? '', { skip: !id });
  const [createIntakeForm, { isLoading: isCreatingIntake }] = useCreateIntakeFormMutation();

  const existingForm = intakeForms?.[0];
  const isFormExpired =
    existingForm?.status === 'completed' &&
    !!existingForm?.expiresAt &&
    new Date(existingForm.expiresAt) < new Date();

  const handleIntakeForm = async () => {
    if (existingForm) {
      router.push(`/intake-form/${existingForm._id}`);
      return;
    }
    if (!patient?._id) return;
    const result = await createIntakeForm({
      patientId: patient._id,
      orgId: appt?.orgId,
      appointmentId: id,
    });
    if ('data' in result && result.data?._id) {
      router.push(`/intake-form/${result.data._id}`);
    }
  };

  const isTelehealth = appt?.deliveryMode === 'video';

  const { data: videoSession } = useGetVideoSessionByAppointmentQuery(id ?? '', {
    skip: !id || !isTelehealth,
    pollingInterval: 15_000, // poll so the button activates once the doctor creates the room
  });

  const { canJoin: withinWindow, minutesUntil } = useJoinWindow(appt?.scheduledAt);
  const sessionInProgress = videoSession?.status === 'in_progress';
  const canJoin = withinWindow || sessionInProgress;

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
        `Your visit starts at ${scheduled}. You can join up to 10 minutes before, or as soon as your doctor opens the room.`,
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

  // Join button: only shown when within the 10-min window (or session is live)
  // and the video room exists and hasn't ended.
  const sessionCompleted = videoSession?.status === 'completed';
  const showJoin = isTelehealth && !!videoSession && canJoin && !sessionCompleted;

  const joinButtonEl = showJoin ? (
    <TouchableOpacity
      style={styles.joinBtn}
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
        intakeFormRow={
          <TouchableOpacity
            style={styles.intakeRow}
            onPress={handleIntakeForm}
            activeOpacity={0.7}
            disabled={isCreatingIntake}
          >
            <View style={styles.intakeRowLeft}>
              <View style={styles.intakeIcon}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.intakeRowTitle}>Health Intake Form</Text>
                <Text style={styles.intakeRowSub}>
                  {isFormExpired
                    ? 'Expired — please complete again'
                    : existingForm?.status === 'completed'
                    ? 'Submitted'
                    : existingForm
                    ? 'Draft — tap to continue'
                    : 'Required before your visit'}
                </Text>
              </View>
            </View>
            {isCreatingIntake ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={styles.intakeRowRight}>
                {isFormExpired ? (
                  <Ionicons name="warning-outline" size={20} color={colors.warning ?? '#f59e0b'} />
                ) : existingForm?.status === 'completed' ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                )}
              </View>
            )}
          </TouchableOpacity>
        }
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

  intakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  intakeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  intakeIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intakeRowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  intakeRowSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  intakeRowRight: {},

  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
