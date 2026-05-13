import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/theme';

type Status = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | string;

const statusMap: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: colors.warningLight, text: colors.warning, label: 'Pending' },
  CONFIRMED: { bg: colors.successLight, text: colors.success, label: 'Confirmed' },
  COMPLETED: { bg: colors.primaryLight, text: colors.primary, label: 'Completed' },
  CANCELLED: { bg: colors.gray100, text: colors.gray500, label: 'Cancelled' },
  NO_SHOW: { bg: colors.dangerLight, text: colors.danger, label: 'No Show' },
};

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? {
    bg: colors.gray100,
    text: colors.gray500,
    label: status,
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
