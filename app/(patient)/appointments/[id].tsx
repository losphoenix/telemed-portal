import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, StatusBadge, Avatar, Button } from '@/components';
import { colors, spacing, typography } from '@/theme';
import {
  useGetAppointmentQuery,
  useCancelAppointmentMutation,
} from '@/services/appointmentApi';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: appt, isLoading } = useGetAppointmentQuery(id ?? '');
  const [cancelAppt, { isLoading: isCancelling }] = useCancelAppointmentMutation();

  const handleCancel = () => {
    Alert.alert('Cancel appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel appointment',
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
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!appt) return null;

  const canCancel = ['PENDING', 'CONFIRMED'].includes(appt.status);
  const isTelehealth = appt.deliveryMode === 'telehealth';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={typography.h4}>Visit details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <Avatar name={(appt.doctorId as any)?.name} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={typography.h3}>{(appt.doctorId as any)?.name}</Text>
              <Text style={typography.bodySmall}>{(appt.serviceId as any)?.name}</Text>
              <StatusBadge status={appt.status} />
            </View>
          </View>
        </Card>

        <Card>
          <DetailRow icon="calendar-outline" label="Date & time">
            {new Date(appt.scheduledAt).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </DetailRow>

          <DetailRow icon="time-outline" label="Duration">
            {`${appt.duration} minutes`}
          </DetailRow>

          <DetailRow icon={isTelehealth ? 'videocam-outline' : 'business-outline'} label="Type">
            {isTelehealth ? 'Telehealth (video)' : 'In-person'}
          </DetailRow>

          {(appt.roomId as any)?.name && (
            <DetailRow icon="location-outline" label="Room">
              {(appt.roomId as any).name}
            </DetailRow>
          )}

          {appt.notes && (
            <DetailRow icon="document-text-outline" label="Notes">
              {appt.notes}
            </DetailRow>
          )}
        </Card>

        {isTelehealth && appt.status === 'CONFIRMED' && appt.videoLink && (
          <Button
            label="Join telehealth visit"
            onPress={() =>
              router.push({
                pathname: '/(patient)/appointments/join',
                params: { id: appt._id },
              })
            }
          />
        )}

        {canCancel && (
          <Button
            label="Cancel appointment"
            variant="danger"
            loading={isCancelling}
            onPress={handleCancel}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.gray400} style={styles.detailIcon} />
      <View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={typography.body}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  content: { padding: spacing.base, gap: spacing.md },
  heroCard: {},
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  detailIcon: { marginTop: 2 },
});
