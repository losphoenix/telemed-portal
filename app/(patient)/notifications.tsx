import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/theme';
import { useGetNotificationsQuery, NotificationItem } from '@/services/notificationApi';

function NotifRow({ item }: { item: NotificationItem }) {
  const isEmail = item.channel === 'email';
  return (
    <View style={styles.notifRow}>
      <View style={styles.notifIcon}>
        <Ionicons
          name={isEmail ? 'mail-outline' : 'chatbubble-outline'}
          size={18}
          color={colors.primary}
        />
      </View>
      <View style={styles.notifContent}>
        <Text style={typography.h4} numberOfLines={1}>
          {item.subject ?? item.type}
        </Text>
        <Text style={typography.caption}>
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: item.status === 'SENT' ? colors.success : colors.gray300 },
        ]}
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications, isLoading } = useGetNotificationsQuery(
    { orgId: '', limit: 30 },
    { skip: true },
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={typography.h4}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={notifications ?? []}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <NotifRow item={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[typography.bodySmall, styles.empty]}>No notifications yet</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  loader: { marginTop: spacing['3xl'] },
  list: { padding: spacing.base },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: { flex: 1, gap: 2 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing['3xl'],
    color: colors.textSecondary,
  },
});
