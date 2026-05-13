import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Card, Avatar, Button } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCredentials } from '@/store/authSlice';
import { useGetMeQuery } from '@/services/authApi';

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.gray400} />
      <View style={styles.rowContent}>
        <Text style={typography.caption}>{label}</Text>
        <Text style={typography.body}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { patient } = useAppSelector((s) => s.auth);
  const { data: me } = useGetMeQuery();

  const displayPatient = me ?? patient;

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          dispatch(clearCredentials());
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  return (
    <ScreenContainer contentStyle={styles.content}>
      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <Avatar name={displayPatient?.name} size={80} />
        <Text style={typography.h3}>{displayPatient?.name}</Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
          {displayPatient?.email}
        </Text>
      </View>

      {/* Profile info */}
      <Card>
        <ProfileRow
          icon="person-outline"
          label="Full name"
          value={displayPatient?.name}
        />
        <ProfileRow
          icon="mail-outline"
          label="Email"
          value={displayPatient?.email}
        />
        <ProfileRow
          icon="call-outline"
          label="Phone number"
          value={(displayPatient as any)?.phoneNumber}
        />
        <ProfileRow
          icon="calendar-outline"
          label="Date of birth"
          value={(displayPatient as any)?.dateOfBirth}
        />
      </Card>

      {/* Actions */}
      <Card>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(patient)/documents')}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={[typography.body, { flex: 1 }]}>Insurance & ID documents</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={[typography.body, { flex: 1 }]}>Notification preferences</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(patient)/notifications')}
        >
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={[typography.body, { flex: 1 }]}>Notification history</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
        </TouchableOpacity>
      </Card>

      <Button label="Sign out" variant="secondary" onPress={handleLogout} />

      <Text style={[typography.caption, styles.version]}>
        Telemedicine Portal v1.0.0
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  avatarSection: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  rowContent: { gap: 2 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  version: { textAlign: 'center', color: colors.textDisabled },
});
