import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, StatusBadge, Avatar, Button } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetAppointmentsByPatientQuery, Appointment } from '@/services/appointmentApi';

const TEAL = '#1a7a6e';

export default function AppointmentsScreen() {
  const router = useRouter();
  const { patient, token } = useAppSelector((s) => s.auth);

  // Decode patientId from JWT as fallback when Redux patient hasn't loaded yet
  const patientId =
    patient?._id ??
    (() => {
      try {
        return JSON.parse(atob(token!.split('.')[1])).id as string;
      } catch {
        return null;
      }
    })();

  const { data, isLoading, isFetching, refetch } = useGetAppointmentsByPatientQuery(
    { patientId: patientId ?? '', limit: 30 },
    { skip: !patientId },
  );

  // Refetch every time the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (patientId) refetch();
    }, [patientId, refetch]),
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
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>My Visits</Text>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push('/(patient)/appointments/book')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={TEAL} />
          <Text style={styles.bookBtnText}>Book</Text>
        </TouchableOpacity>
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
          refreshing={isFetching}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TEAL,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bookBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEAL,
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
