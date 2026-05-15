import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Avatar } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCredentials } from '@/store/authSlice';
import { useGetPatientQuery } from '@/services/patientApi';

type ListRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  onPress?: () => void;
  isLast?: boolean;
  destructive?: boolean;
};

function ListRow({ icon, iconColor = colors.primary, label, onPress, isLast, destructive }: ListRowProps) {
  return (
    <TouchableOpacity
      style={[styles.listRow, !isLast && styles.listRowBorder]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.listIcon, { backgroundColor: destructive ? colors.dangerLight : colors.primaryLight }]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.danger : iconColor} />
      </View>
      <Text style={[styles.listLabel, destructive && { color: colors.danger }]}>{label}</Text>
      {!destructive && (
        <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { patient } = useAppSelector((s) => s.auth);
  const { data: me } = useGetPatientQuery(patient?._id ?? '', { skip: !patient?._id });

  const displayName = me
    ? (me.firstName && me.lastName ? `${me.firstName} ${me.lastName}` : me.name)
    : (patient?.name ?? '');

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          dispatch(clearCredentials());
          router.replace('/(auth)/');
        },
      },
    ]);
  };

  return (
    <ScreenContainer edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Avatar name={displayName} size={72} />
          <Text style={typography.h3}>{displayName || '—'}</Text>
          <Text style={styles.email}>{me?.email ?? patient?.email}</Text>
        </View>

        {/* Personal section */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <ListRow
            icon="person-outline"
            label="Personal Information"
            onPress={() => router.push('/(patient)/profile-detail')}
          />
          <ListRow
            icon="shield-checkmark-outline"
            label="Insurance & ID Documents"
            onPress={() => router.push('/(patient)/documents')}
            isLast
          />
        </View>

        {/* Preferences section */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <ListRow
            icon="notifications-outline"
            label="Notification Preferences"
          />
          <ListRow
            icon="time-outline"
            label="Notification History"
            onPress={() => router.push('/(patient)/notifications')}
            isLast
          />
        </View>

        {/* Sign out */}
        <Text style={styles.sectionLabel}>SESSION</Text>
        <View style={styles.card}>
          <ListRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleLogout}
            destructive
            isLast
          />
        </View>

        <Text style={styles.version}>iMedical v1.0.0</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing['4xl'],
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  email: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
    marginBottom: spacing.lg,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textDisabled,
    marginTop: spacing.sm,
  },
});
