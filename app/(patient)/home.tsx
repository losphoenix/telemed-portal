import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Card, StatusBadge, Avatar } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetAppointmentsByPatientQuery } from '@/services/appointmentApi';
import { useGetFollowUpsByPatientQuery } from '@/services/followUpApi';
import { useGetConversationsQuery } from '@/services/conversationApi';

export default function HomeScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);

  const { data: apptData, isLoading: apptLoading } = useGetAppointmentsByPatientQuery(
    { patientId: patient?._id ?? '', limit: 3 },
    { skip: !patient?._id },
  );

  const { data: followUps } = useGetFollowUpsByPatientQuery(patient?._id ?? '', {
    skip: !patient?._id,
  });

  const { data: conversations } = useGetConversationsQuery(
    { orgId: '' },
    { skip: true },
  );

  const nextAppointment = apptData?.data?.[0];
  const pendingFollowUp = followUps?.find(
    (f) => f.status === 'PENDING' || f.status === 'SENT',
  );
  const totalUnread = conversations?.data?.reduce(
    (acc, c) => acc + (c.unreadCount ?? 0),
    0,
  );

  const firstName = patient?.name?.split(' ')[0] ?? 'there';

  return (
    <ScreenContainer
      onRefresh={() => {}}
      refreshing={false}
      contentStyle={styles.content}
    >
      {/* Greeting */}
      <View style={styles.greeting}>
        <View>
          <Text style={typography.h3}>Hi, {firstName} 👋</Text>
          <Text style={[typography.bodySmall, { marginTop: 2 }]}>
            How are you feeling today?
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(patient)/notifications')}>
          <Ionicons name="notifications-outline" size={24} color={colors.gray600} />
        </TouchableOpacity>
      </View>

      {/* AI Chat CTA */}
      <TouchableOpacity
        style={styles.aiCta}
        onPress={() => router.push('/(patient)/concierge')}
        activeOpacity={0.85}
      >
        <View style={styles.aiCtaIcon}>
          <Ionicons name="sparkles" size={20} color={colors.white} />
        </View>
        <View style={styles.aiCtaText}>
          <Text style={[typography.h4, { color: colors.white }]}>
            Chat with AI Care Assistant
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
            Book, ask questions, or check in
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {/* Next Appointment */}
      <View style={styles.section}>
        <Text style={[typography.h4, styles.sectionTitle]}>Upcoming visit</Text>
        {apptLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : nextAppointment ? (
          <Card>
            <TouchableOpacity
              onPress={() =>
                router.push(`/(patient)/appointments/${nextAppointment._id}`)
              }
            >
              <View style={styles.apptRow}>
                <Avatar name={nextAppointment.doctorId?.name} size={44} />
                <View style={styles.apptInfo}>
                  <Text style={typography.h4}>{nextAppointment.doctorId?.name}</Text>
                  <Text style={typography.bodySmall}>
                    {nextAppointment.serviceId?.name}
                  </Text>
                  <Text style={[typography.caption, styles.apptDate]}>
                    {new Date(nextAppointment.scheduledAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <StatusBadge status={nextAppointment.status} />
              </View>

              {nextAppointment.deliveryMode === 'telehealth' &&
                nextAppointment.status === 'CONFIRMED' &&
                nextAppointment.videoLink && (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/(patient)/appointments/join',
                        params: { id: nextAppointment._id },
                      })
                    }
                  >
                    <Ionicons name="videocam" size={16} color={colors.white} />
                    <Text style={styles.joinBtnText}>Join visit</Text>
                  </TouchableOpacity>
                )}
            </TouchableOpacity>
          </Card>
        ) : (
          <Card>
            <Text style={typography.bodySmall}>No upcoming visits.</Text>
            <TouchableOpacity
              style={styles.bookLink}
              onPress={() => router.push('/(patient)/appointments/book')}
            >
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                Book now →
              </Text>
            </TouchableOpacity>
          </Card>
        )}
      </View>

      {/* Pending Follow-up */}
      {pendingFollowUp && (
        <View style={styles.section}>
          <Text style={[typography.h4, styles.sectionTitle]}>Follow-up check-in</Text>
          <Card style={styles.followUpCard}>
            <TouchableOpacity
              onPress={() =>
                router.push(`/(patient)/follow-up/${pendingFollowUp._id}`)
              }
            >
              <View style={styles.followUpRow}>
                <View style={styles.followUpIcon}>
                  <Ionicons name="chatbubble-ellipses" size={18} color={colors.ai} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={typography.h4}>Your doctor has a question</Text>
                  <Text style={typography.bodySmall}>
                    {pendingFollowUp.aiQuestion
                      ? pendingFollowUp.aiQuestion.slice(0, 80) + '...'
                      : 'Tap to respond to your follow-up check-in.'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
              </View>
            </TouchableOpacity>
          </Card>
        </View>
      )}

      {/* Unread messages */}
      {totalUnread && totalUnread > 0 ? (
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => router.push('/(patient)/conversations/index')}
          >
            <Card style={styles.unreadCard}>
              <Ionicons name="mail-unread" size={20} color={colors.primary} />
              <Text style={[typography.body, { flex: 1 }]}>
                You have{' '}
                <Text style={{ fontWeight: '700' }}>{totalUnread} unread</Text>{' '}
                message{totalUnread > 1 ? 's' : ''}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
            </Card>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={[typography.h4, styles.sectionTitle]}>Quick actions</Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="calendar-outline"
            label="Book visit"
            onPress={() => router.push('/(patient)/appointments/book')}
          />
          <QuickAction
            icon="chatbubbles-outline"
            label="Message doctor"
            onPress={() => router.push('/(patient)/conversations/index')}
          />
          <QuickAction
            icon="person-outline"
            label="My profile"
            onPress={() => router.push('/(patient)/profile')}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={[typography.caption, { textAlign: 'center', marginTop: 4 }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.base,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  aiCta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  aiCtaIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCtaText: { flex: 1 },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  apptInfo: { flex: 1, gap: 2 },
  apptDate: { marginTop: 2, color: colors.primary },
  joinBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  joinBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  bookLink: {
    marginTop: spacing.sm,
  },
  followUpCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.ai,
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  followUpIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.aiLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
