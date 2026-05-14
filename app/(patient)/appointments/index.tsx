import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, StatusBadge, Avatar, Button } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetAppointmentsByPatientQuery, Appointment } from '@/services/appointmentApi';

export default function AppointmentsScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);

  const { data, isLoading, refetch } = useGetAppointmentsByPatientQuery(
    { patientId: patient?._id ?? '', limit: 30 },
    { skip: !patient?._id },
  );

  const renderItem = ({ item }: { item: Appointment }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(patient)/appointments/${item._id}`)}
      activeOpacity={0.85}
    >
      <Card style={styles.card}>
        <View style={styles.cardRow}>
          <Avatar name={item.doctorId?.name} size={44} />
          <View style={styles.info}>
            <Text style={typography.h4}>{item.doctorId?.name}</Text>
            <Text style={typography.bodySmall}>{item.serviceId?.name}</Text>
            <Text style={[typography.caption, { color: colors.primary, marginTop: 2 }]}>
              {new Date(item.scheduledAt).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {item.deliveryMode === 'telehealth' && item.status === 'CONFIRMED' && (
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() =>
              router.push({
                pathname: '/(patient)/appointments/join',
                params: { id: item._id },
              })
            }
          >
            <Ionicons name="videocam" size={15} color={colors.white} />
            <Text style={styles.joinText}>Join telehealth visit</Text>
          </TouchableOpacity>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.h2}>My visits</Text>
        <Button
          label="Book new"
          size="sm"
          onPress={() => router.push('/(patient)/appointments/book')}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={colors.gray300} />
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                No visits yet
              </Text>
              <Button
                label="Book your first visit"
                style={styles.emptyBtn}
                onPress={() => router.push('/(patient)/appointments/book')}
              />
            </View>
          }
        />
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
  },
  loader: { marginTop: spacing['3xl'] },
  list: { padding: spacing.base, gap: spacing.md },
  card: { gap: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  joinText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: spacing['4xl'] },
  emptyBtn: { marginTop: spacing.lg, minWidth: 200 },
});
