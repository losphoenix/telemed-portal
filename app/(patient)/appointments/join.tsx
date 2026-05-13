import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useGetAppointmentQuery } from '@/services/appointmentApi';

export default function JoinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: appt, isLoading } = useGetAppointmentQuery(id ?? '');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!appt?.videoLink) return;
    setJoining(true);
    try {
      await WebBrowser.openBrowserAsync(appt.videoLink);
    } catch {
      Alert.alert('Error', 'Could not open the video link. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.videoIcon}>
          <Ionicons name="videocam" size={40} color={colors.white} />
        </View>

        <Text style={typography.h2}>Ready to join?</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Your telehealth visit with{' '}
          <Text style={{ fontWeight: '600' }}>
            {(appt?.doctorId as any)?.name}
          </Text>{' '}
          is confirmed.
        </Text>

        <Card style={styles.infoCard}>
          <Text style={typography.bodySmall}>
            Scheduled for{' '}
            {appt?.scheduledAt
              ? new Date(appt.scheduledAt).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </Text>
          <Text style={[typography.caption, { marginTop: spacing.xs }]}>
            {(appt?.serviceId as any)?.name}
          </Text>
        </Card>

        <View style={styles.checklist}>
          {['Camera and microphone allowed', 'Quiet, well-lit space', 'Stable internet connection'].map((item) => (
            <View key={item} style={styles.checkItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={typography.bodySmall}>{item}</Text>
            </View>
          ))}
        </View>

        <Button
          label="Join visit now"
          onPress={handleJoin}
          loading={joining}
          disabled={!appt?.videoLink}
          style={styles.joinBtn}
        />

        <Button
          label="Go back"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: {
    flex: 1,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.lg,
  },
  videoIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  infoCard: {
    width: '100%',
    alignItems: 'center',
  },
  checklist: {
    width: '100%',
    gap: spacing.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  joinBtn: {
    width: '100%',
    marginTop: spacing.sm,
  },
});
