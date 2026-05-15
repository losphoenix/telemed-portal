import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components';
import { colors, spacing, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetAppointmentsByPatientQuery } from '@/services/appointmentApi';
import { useGetOrganizationsQuery } from '@/services/orgApi';

const TEAL = '#1a7a6e';
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

  const { data: apptData, isLoading: apptLoading } = useGetAppointmentsByPatientQuery(
    { patientId: patientId ?? '', limit: 1 },
    { skip: !patientId },
  );

  const { data: orgs = [] } = useGetOrganizationsQuery();

  const nextAppt = apptData?.data?.[0];
  const firstName = patient?.name?.split(' ')[0] ?? 'there';
  const isVideo = nextAppt?.deliveryMode === 'telehealth';

  // Action items — static for now, will be driven by patient profile completeness
  const actions = [
    {
      title: 'Add Insurance Details',
      subtitle: 'Accomplish by May 18, 2026',
      icon: 'card-outline',
      onPress: () => Alert.alert('Add Insurance', 'Insurance setup coming soon.'),
    },
    {
      title: 'Choose a PCP',
      subtitle: 'Select your primary care provider',
      icon: 'person-circle-outline',
      onPress: () => Alert.alert('Choose a PCP', 'PCP selection coming soon.'),
    },
    {
      title: 'New Member Health History',
      subtitle: 'Complete your medical history',
      icon: 'document-text-outline',
      onPress: () => Alert.alert('Health History', 'Health history form coming soon.'),
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
      >

        {/* ── Upcoming appointment ── */}
        {apptLoading ? (
          <View style={styles.apptCardWrap}>
            <ActivityIndicator color={TEAL} />
          </View>
        ) : nextAppt ? (
          <View style={styles.apptCardWrap}>
            <View style={styles.apptCard}>
              <View style={styles.apptCardInner}>
                {/* Text info */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.apptCardTitle} numberOfLines={2}>
                    Upcoming {nextAppt.serviceId?.name ?? (isVideo ? 'Remote Visit' : 'Visit')}
                    {'\n'}with {(nextAppt.doctorId as any)?.name ?? 'your provider'}
                  </Text>
                  <Text style={styles.apptCardDate}>{formatApptDate(nextAppt.scheduledAt)}</Text>
                </View>
                {/* Doctor avatar */}
                <View style={styles.apptAvatarWrap}>
                  <Avatar name={(nextAppt.doctorId as any)?.name} size={56} />
                  {isVideo && (
                    <View style={styles.apptVideoBadge}>
                      <Ionicons name="videocam" size={10} color={colors.white} />
                    </View>
                  )}
                </View>
              </View>
              {/* Action buttons */}
              <View style={styles.apptBtns}>
                <TouchableOpacity
                  style={styles.apptBtnPrimary}
                  onPress={() => router.push(`/(patient)/appointments/${nextAppt._id}`)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.apptBtnPrimaryText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
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
        {!apptLoading && !nextAppt && (
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

  // Appointment card
  apptCardWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
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
  },
  apptCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  apptCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 6,
  },
  apptCardDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  apptAvatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  apptVideoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  apptBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
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
