import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@/theme';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCredentials } from '@/store/authSlice';
import { useGetPatientQuery } from '@/services/patientApi';

const TEAL = '#1a7a6e';

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
  const { data: me, isFetching, refetch } = useGetPatientQuery(patient?._id ?? '', { skip: !patient?._id });

  useFocusEffect(
    useCallback(() => {
      if (patient?._id) refetch();
    }, [patient?._id, refetch]),
  );

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Teal top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>My Health</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={typography.h3}>{displayName || '—'}</Text>
          <Text style={styles.email}>{me?.email ?? patient?.email}</Text>
        </View>

        {/* My Health section */}
        <Text style={styles.sectionLabel}>MY HEALTH</Text>
        <View style={styles.card}>
          <ListRow
            icon="calendar-outline"
            label="My Visits"
            onPress={() => router.push('/(patient)/appointments')}
          />
          <TouchableOpacity
            style={[styles.listRow, styles.listRowBorder]}
            onPress={() => router.push('/(patient)/pcp')}
            activeOpacity={0.6}
          >
            <View style={[styles.listIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="medical-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listLabel}>Primary Care Provider</Text>
              {me?.pcp ? (
                <Text style={styles.listSub}>
                  {me.pcp.isExternal
                    ? (me.pcp.name ?? 'External provider')
                    : typeof me.pcp.doctorId === 'object'
                      ? (me.pcp.doctorId as any).name
                      : 'In-network provider'}
                </Text>
              ) : (
                <Text style={[styles.listSub, { color: '#e67e22' }]}>Not set — tap to choose</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
          </TouchableOpacity>
          <ListRow
            icon="document-text-outline"
            label="Intake Form History"
            onPress={() => router.push('/(patient)/intake-form')}
            isLast
          />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TEAL,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.base,
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
  listSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textDisabled,
    marginTop: spacing.sm,
  },
});
