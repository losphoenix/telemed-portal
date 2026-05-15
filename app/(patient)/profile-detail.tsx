import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useGetPatientQuery } from '@/services/patientApi';
import { useAppSelector } from '@/store/hooks';

function formatDate(raw?: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatGender(raw?: string): string {
  if (!raw) return '';
  const map: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say',
  };
  return map[raw] ?? raw;
}

type SectionProps = { title: string; children: React.ReactNode };

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

type RowProps = { label: string; value?: string; isLast?: boolean };

function Row({ label, value, isLast }: RowProps) {
  const empty = !value;
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, empty && styles.rowEmpty]} numberOfLines={2}>
        {empty ? 'Not provided' : value}
      </Text>
    </View>
  );
}

export default function ProfileDetailScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);
  const { data: me, isLoading } = useGetPatientQuery(patient?._id ?? '', {
    skip: !patient?._id,
  });

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      {/* Nav header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Personal Information</Text>
        <TouchableOpacity
          onPress={() => router.push('/(patient)/profile-edit')}
          style={styles.editBtn}
          hitSlop={8}
        >
          <Text style={styles.editLabel}>Edit</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Section title="NAME">
            <Row label="Legal first name" value={me?.firstName} />
            <Row label="Legal last name" value={me?.lastName} isLast />
          </Section>

          <Section title="CONTACT">
            <Row label="Email" value={me?.email} />
            <Row label="Phone number" value={me?.phoneNumber} />
            <Row label="Address" value={me?.address} isLast />
          </Section>

          <Section title="HEALTH IDENTITY">
            <Row label="Date of birth" value={formatDate(me?.dateOfBirth)} />
            <Row label="Legal sex" value={formatGender(me?.gender)} isLast />
          </Section>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 48,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  editBtn: {
    width: 48,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  editLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.textDisabled,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '400',
    flex: 1,
  },
  rowValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1.2,
    textAlign: 'right',
  },
  rowEmpty: {
    color: colors.textDisabled,
    fontWeight: '400',
    fontStyle: 'italic',
  },
});
