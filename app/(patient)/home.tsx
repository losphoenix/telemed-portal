import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar } from '@/components';
import { colors, spacing, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetAppointmentsByPatientQuery } from '@/services/appointmentApi';
import { useGetOrganizationsQuery } from '@/services/orgApi';
import { useGetPatientQuery } from '@/services/patientApi';
import { useGetVideoSessionByAppointmentQuery } from '@/services/videoSessionApi';

const TEAL = '#1a7a6e';
const JOIN_WINDOW_MS = 10 * 60 * 1000;

function canJoinNow(scheduledAt: string) {
  return Date.now() >= new Date(scheduledAt).getTime() - JOIN_WINDOW_MS;
}
const TEAL_LIGHT = '#e8f4f2';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatApptDate(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  });
  return `${datePart} at ${timePart}`;
}

// ─── Action card (horizontal scroll item) ────────────────────────────────────

function ActionCard({
  title, subtitle, icon, onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.actionCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon as any} size={20} color={TEAL} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Visit type card (schedule grid) ─────────────────────────────────────────

function VisitCard({
  icon, label, onPress, iconBg,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  iconBg: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.visitCard}>
      <View style={[styles.visitIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={26} color={TEAL} />
      </View>
      <Text style={styles.visitLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Active visit card ────────────────────────────────────────────────────────

function ActiveVisitCard({ appt }: { appt: any }) {
  const router = useRouter();
  const isVideo = appt.deliveryMode === 'video';
  const isLive = appt.status === 'in_progress';
  const isActive = appt.status === 'confirmed' || appt.status === 'in_progress';

  const { data: videoSession } = useGetVideoSessionByAppointmentQuery(appt._id, {
    skip: !isVideo || !isActive || !canJoinNow(appt.scheduledAt),
    pollingInterval: 15_000,
  });

  const showJoin = isVideo && isActive && canJoinNow(appt.scheduledAt) &&
    !!videoSession && videoSession.status !== 'completed';

  return (
    <TouchableOpacity
      style={[styles.apptCard, isLive && styles.apptCardLive]}
      onPress={() => router.push(`/(patient)/appointments/${appt._id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.apptCardInner}>
        {/* Text info */}
        <View style={{ flex: 1 }}>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live Now</Text>
            </View>
          )}
          <Text style={styles.apptCardTitle} numberOfLines={2}>
            {(appt.serviceId as any)?.name ?? (isVideo ? 'Remote Visit' : 'Visit')}
            {'\n'}with {(appt.doctorId as any)?.name ?? 'your provider'}
          </Text>
          <Text style={styles.apptCardDate}>{formatApptDate(appt.scheduledAt)}</Text>
          {isVideo && (
            <View style={styles.apptModeBadge}>
              <Ionicons name="videocam" size={11} color={TEAL} />
              <Text style={styles.apptModeBadgeText}>Video</Text>
            </View>
          )}
        </View>
        {/* Doctor avatar */}
        <View style={styles.apptAvatarWrap}>
          <Avatar name={(appt.doctorId as any)?.name} size={52} />
          {isLive && (
            <View style={styles.apptLiveDotBadge} />
          )}
        </View>
      </View>
      {showJoin && (
        <TouchableOpacity
          style={styles.joinBtn}
          activeOpacity={0.85}
          onPress={(e) => {
            e.stopPropagation?.();
            router.push({
              pathname: '/(patient)/appointments/join',
              params: { id: appt._id },
            });
          }}
        >
          <Ionicons name="videocam" size={15} color={colors.white} />
          <Text style={styles.joinBtnText}>Join video visit</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { patient, token } = useAppSelector((s) => s.auth);

  const patientId =
    patient?._id ??
    (() => {
      try { return JSON.parse(atob(token!.split('.')[1])).id as string; }
      catch { return null; }
    })();

  const { data: apptData, isLoading: apptLoading, isFetching: apptFetching, refetch: refetchAppts } = useGetAppointmentsByPatientQuery(
    { patientId: patientId ?? '', limit: 20 },
    { skip: !patientId },
  );

  const { data: orgs = [], refetch: refetchOrgs } = useGetOrganizationsQuery();
  const { data: me, refetch: refetchMe } = useGetPatientQuery(patientId ?? '', { skip: !patientId });

  const refetchAll = useCallback(() => {
    if (!patientId) return;
    refetchAppts();
    refetchOrgs();
    refetchMe();
  }, [patientId, refetchAppts, refetchOrgs, refetchMe]);

  useFocusEffect(
    useCallback(() => {
      refetchAll();
    }, [refetchAll]),
  );

  const activeAppts = (apptData?.data ?? [])
    .filter((a) => a.status === 'in_progress' || a.status === 'confirmed')
    .sort((a, b) => {
      // in_progress floats to top, then earliest scheduledAt first
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

  const rawName = patient?.name ?? '';
  const firstName = rawName.includes('@')
    ? rawName.split('@')[0]
    : rawName.split(' ')[0] || 'there';

  const insuranceComplete = !!(
    me?.insurance?.provider &&
    me?.insurance?.memberId &&
    me?.insurance?.groupNumber &&
    me?.driverLicense?.number &&
    me?.driverLicense?.state &&
    me?.driverLicense?.expiryDate
  );

  // Action items — hide "Add Insurance Details" once insurance + license are complete
  const actions = [
    ...(!insuranceComplete ? [{
      title: 'Add Insurance Details',
      subtitle: 'Add your insurance & ID documents',
      icon: 'card-outline',
      onPress: () => router.push('/(patient)/documents'),
    }] : []),
    {
      title: 'PCP',
      subtitle: 'View your primary care provider',
      icon: 'medical-outline',
      onPress: () => router.push('/(patient)/profile'),
    },
    {
      title: 'Intake Form History',
      subtitle: 'View your past intake forms',
      icon: 'document-text-outline',
      onPress: () => router.push('/(patient)/intake-form'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        {/* Left: avatar + name */}
        <View style={styles.profileSwitcher}>
          <View style={styles.topAvatar}>
            <Text style={styles.topAvatarText}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.topName}>{firstName}</Text>
        </View>

        {/* Right: notification bell */}
        <TouchableOpacity
          onPress={() => router.push('/(patient)/notifications')}
          style={styles.topIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={apptFetching}
            onRefresh={refetchAll}
            tintColor={TEAL}
            colors={[TEAL]}
          />
        }
      >

        {/* ── Active Visits ── */}
        {apptLoading ? (
          <View style={styles.apptCardWrap}>
            <ActivityIndicator color={TEAL} />
          </View>
        ) : activeAppts.length > 0 ? (
          <View style={styles.apptCardWrap}>
            <View style={styles.apptSectionHeader}>
              <Text style={styles.apptSectionTitle}>Active Visits</Text>
              <View style={styles.apptCountBadge}>
                <Text style={styles.apptCountText}>{activeAppts.length}</Text>
              </View>
            </View>
            {activeAppts.map((appt) => (
              <ActiveVisitCard key={appt._id} appt={appt} />
            ))}
          </View>
        ) : null}

        {/* ── Your Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Actions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsScroll}
          >
            {actions.map((a) => (
              <ActionCard
                key={a.title}
                title={a.title}
                subtitle={a.subtitle}
                icon={a.icon}
                onPress={a.onPress}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Schedule a Visit ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule a Visit</Text>
          <View style={styles.scheduleHint}>
            <Ionicons name="notifications-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.scheduleHintText}>
              Billed to you or your insurance.{' '}
              <Text style={styles.scheduleLearnMore}>Learn more</Text>
            </Text>
          </View>
          <View style={styles.visitGrid}>
            <VisitCard
              icon="videocam-outline"
              label="Video Visit"
              iconBg={TEAL_LIGHT}
              onPress={() => router.push('/(patient)/appointments/book')}
            />
            <VisitCard
              icon="business-outline"
              label="In-Person Visit"
              iconBg="#fef3e2"
              onPress={() => router.push('/(patient)/appointments/book')}
            />
            <VisitCard
              icon="clipboard-outline"
              label={`Annual\nCheckup`}
              iconBg="#f0f4ff"
              onPress={() => router.push('/(patient)/appointments/book')}
            />
          </View>
        </View>

        {/* ── Nearby Locations ── */}
        {orgs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nearby Locations</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionsScroll}
            >
              {orgs.map((org) => (
                <TouchableOpacity
                  key={org._id}
                  style={styles.locationCard}
                  onPress={() => router.push(`/(patient)/locations/${org._id}`)}
                  activeOpacity={0.8}
                >
                  {/* Placeholder image area */}
                  <View style={styles.locationImgPlaceholder}>
                    <Ionicons name="business" size={28} color={TEAL} />
                  </View>
                  <View style={styles.locationCardBody}>
                    <Text style={styles.locationName} numberOfLines={1}>{org.name}</Text>
                    {(org.address || org.contactInfo?.address) && (
                      <Text style={styles.locationAddress} numberOfLines={2}>
                        {org.address ?? org.contactInfo?.address}
                      </Text>
                    )}
                    <View style={styles.locationChip}>
                      <Ionicons name="navigate-outline" size={11} color={TEAL} />
                      <Text style={styles.locationChipText}>Get directions</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* No upcoming appt nudge */}
        {!apptLoading && activeAppts.length === 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.bookNudge}
              onPress={() => router.push('/(patient)/appointments/book')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={20} color={TEAL} />
              <Text style={styles.bookNudgeText}>No upcoming visits — book one now</Text>
              <Ionicons name="chevron-forward" size={18} color={TEAL} />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TEAL,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  profileSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAvatarText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  topName: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  topIconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing['3xl'],
    gap: spacing.xl,
  },

  // Appointment section
  apptCardWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    gap: spacing.sm,
  },
  apptSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  apptSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  apptCountBadge: {
    backgroundColor: TEAL,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  apptCountText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  apptCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  apptCardLive: {
    borderColor: TEAL,
    borderWidth: 1.5,
  },
  apptCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  apptCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },
  apptCardDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  apptModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: TEAL_LIGHT,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  apptModeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: TEAL,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  apptAvatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  apptLiveDotBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16a34a',
    borderWidth: 2,
    borderColor: colors.white,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: TEAL,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  joinBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  apptBtnPrimary: {
    flex: 1,
    backgroundColor: TEAL,
    borderRadius: radius.xl,
    paddingVertical: 9,
    alignItems: 'center',
  },
  apptBtnPrimaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  apptBtnSecondary: {
    flex: 1,
    borderRadius: radius.xl,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  apptBtnSecondaryText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Sections
  section: {
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Action cards (horizontal scroll)
  actionsScroll: {
    gap: spacing.md,
    paddingRight: spacing.base,
  },
  actionCard: {
    width: 180,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 18,
  },
  actionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Schedule visit
  scheduleHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -spacing.xs,
  },
  scheduleHintText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scheduleLearnMore: {
    color: TEAL,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  visitGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  visitCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  visitIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Location cards
  locationCard: {
    width: 180,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  locationImgPlaceholder: {
    width: '100%',
    height: 90,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCardBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  locationName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locationAddress: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: spacing.xs,
  },
  locationChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: TEAL,
  },

  // No appt nudge
  bookNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: TEAL_LIGHT,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  bookNudgeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: TEAL,
  },
});
