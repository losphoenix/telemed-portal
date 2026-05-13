import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Button, ScreenContainer } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetServicesQuery, useGetDoctorsQuery } from '@/services/orgApi';
import {
  useGetAvailableSlotsQuery,
  useCreateAppointmentMutation,
  TimeSlot,
} from '@/services/appointmentApi';

type Step = 'service' | 'doctor' | 'date' | 'slots' | 'confirm';

interface BookingState {
  serviceId?: string;
  serviceName?: string;
  deliveryMode?: string;
  duration?: number;
  doctorId?: string;
  doctorName?: string;
  date?: string;
  slot?: TimeSlot;
}

const STEPS: Step[] = ['service', 'doctor', 'date', 'slots', 'confirm'];
const STEP_LABELS = ['Service', 'Doctor', 'Date', 'Time', 'Confirm'];

function StepHeader({ currentStep }: { currentStep: Step }) {
  const idx = STEPS.indexOf(currentStep);
  return (
    <View style={styles.stepHeader}>
      {STEPS.map((s, i) => (
        <View key={s} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              i < idx && styles.stepDone,
              i === idx && styles.stepActive,
            ]}
          >
            {i < idx ? (
              <Ionicons name="checkmark" size={14} color={colors.white} />
            ) : (
              <Text
                style={[
                  styles.stepNum,
                  i === idx && { color: colors.white },
                ]}
              >
                {i + 1}
              </Text>
            )}
          </View>
          {i < STEPS.length - 1 && (
            <View style={[styles.stepLine, i < idx && styles.stepLineDone]} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function BookScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);
  const [step, setStep] = useState<Step>('service');
  const [booking, setBooking] = useState<BookingState>({});

  const { data: services, isLoading: servicesLoading } = useGetServicesQuery('', {
    skip: !patient?._id,
  });

  const { data: doctors, isLoading: doctorsLoading } = useGetDoctorsQuery('', {
    skip: !patient?._id || step !== 'doctor',
  });

  const { data: slots, isLoading: slotsLoading } = useGetAvailableSlotsQuery(
    {
      doctorId: booking.doctorId ?? '',
      date: booking.date ?? '',
      duration: booking.duration,
    },
    { skip: !booking.doctorId || !booking.date || step !== 'slots' },
  );

  const [createAppointment, { isLoading: isCreating }] = useCreateAppointmentMutation();

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
    else router.back();
  };

  const handleConfirm = async () => {
    if (!booking.doctorId || !booking.serviceId || !booking.slot || !patient) return;
    try {
      await createAppointment({
        orgId: '',
        patientId: patient._id,
        doctorId: booking.doctorId,
        serviceId: booking.serviceId,
        scheduledAt: booking.slot.start,
        duration: booking.duration ?? 30,
        deliveryMode: booking.deliveryMode ?? 'in-person',
      }).unwrap();
      Alert.alert('Booked!', 'Your appointment has been confirmed.', [
        { text: 'View visits', onPress: () => router.replace('/(patient)/appointments/index') },
      ]);
    } catch {
      Alert.alert('Error', 'Could not book appointment. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={typography.h4}>Book a visit</Text>
        <View style={{ width: 24 }} />
      </View>

      <StepHeader currentStep={step} />

      {/* Step: Service */}
      {step === 'service' && (
        <ScreenContainer scroll contentStyle={styles.stepContent}>
          <Text style={typography.h3}>What type of visit?</Text>
          {servicesLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            (services ?? []).map((svc) => (
              <TouchableOpacity
                key={svc._id}
                onPress={() => {
                  setBooking((b) => ({
                    ...b,
                    serviceId: svc._id,
                    serviceName: svc.name,
                    deliveryMode: svc.deliveryMode,
                    duration: svc.duration,
                  }));
                  setStep('doctor');
                }}
                activeOpacity={0.8}
              >
                <Card style={styles.optionCard}>
                  <Text style={typography.h4}>{svc.name}</Text>
                  {svc.description && (
                    <Text style={typography.bodySmall}>{svc.description}</Text>
                  )}
                  <View style={styles.svcMeta}>
                    <Text style={typography.caption}>{svc.duration} min</Text>
                    {svc.copayAmount && (
                      <Text style={[typography.caption, { color: colors.primary }]}>
                        Co-pay: ${svc.copayAmount}
                      </Text>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScreenContainer>
      )}

      {/* Step: Doctor */}
      {step === 'doctor' && (
        <ScreenContainer scroll contentStyle={styles.stepContent}>
          <Text style={typography.h3}>Choose a doctor</Text>
          {doctorsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            (doctors ?? []).map((doc) => (
              <TouchableOpacity
                key={doc._id}
                onPress={() => {
                  setBooking((b) => ({ ...b, doctorId: doc._id, doctorName: doc.name }));
                  setStep('date');
                }}
                activeOpacity={0.8}
              >
                <Card style={styles.optionCard}>
                  <View style={styles.docRow}>
                    <Avatar name={doc.name} size={44} />
                    <View>
                      <Text style={typography.h4}>{doc.name}</Text>
                      {doc.specialty && (
                        <Text style={typography.bodySmall}>{doc.specialty}</Text>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScreenContainer>
      )}

      {/* Step: Date */}
      {step === 'date' && (
        <ScreenContainer scroll contentStyle={styles.stepContent}>
          <Text style={typography.h3}>Pick a date</Text>
          {/* Generate next 14 days */}
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i + 1);
            const iso = d.toISOString().split('T')[0];
            const isSelected = booking.date === iso;
            return (
              <TouchableOpacity
                key={iso}
                onPress={() => {
                  setBooking((b) => ({ ...b, date: iso }));
                }}
                activeOpacity={0.8}
              >
                <Card
                  style={[styles.dateChip, isSelected ? styles.dateChipSelected : undefined]}
                >
                  <Text
                    style={[
                      typography.body,
                      isSelected && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {d.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          })}
          {booking.date && (
            <Button label="See available times" onPress={() => setStep('slots')} />
          )}
        </ScreenContainer>
      )}

      {/* Step: Slots */}
      {step === 'slots' && (
        <ScreenContainer scroll contentStyle={styles.stepContent}>
          <Text style={typography.h3}>Choose a time</Text>
          {slotsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !slots?.length ? (
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              No available slots on this day. Try another date.
            </Text>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((slot, i) => {
                const isSelected = booking.slot?.start === slot.start;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setBooking((b) => ({ ...b, slot }))}
                    style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        isSelected && { color: colors.white, fontWeight: '600' },
                      ]}
                    >
                      {new Date(slot.start).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {booking.slot && (
            <Button label="Continue" onPress={() => setStep('confirm')} />
          )}
        </ScreenContainer>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <ScreenContainer scroll contentStyle={styles.stepContent}>
          <Text style={typography.h3}>Confirm your visit</Text>
          <Card style={styles.confirmCard}>
            {[
              { label: 'Service', value: booking.serviceName },
              { label: 'Doctor', value: booking.doctorName },
              {
                label: 'Date & time',
                value: booking.slot
                  ? new Date(booking.slot.start).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—',
              },
              { label: 'Duration', value: `${booking.duration} min` },
              { label: 'Type', value: booking.deliveryMode },
            ].map(({ label, value }) => (
              <View key={label} style={styles.confirmRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={typography.body}>{value}</Text>
              </View>
            ))}
          </Card>
          <Button
            label="Confirm appointment"
            onPress={handleConfirm}
            loading={isCreating}
          />
          <Button label="Go back" variant="ghost" onPress={goBack} />
        </ScreenContainer>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: { backgroundColor: colors.primary },
  stepDone: { backgroundColor: colors.success },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.gray500 },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.gray200,
    marginHorizontal: 4,
  },
  stepLineDone: { backgroundColor: colors.success },
  stepContent: { gap: spacing.md },
  optionCard: { gap: spacing.xs },
  svcMeta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateChip: { paddingVertical: spacing.md },
  dateChipSelected: { borderWidth: 2, borderColor: colors.primary },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  slotChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  confirmCard: { gap: spacing.sm },
  confirmRow: { gap: 2, paddingVertical: spacing.xs },
});
