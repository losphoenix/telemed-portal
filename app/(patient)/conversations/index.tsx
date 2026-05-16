import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar } from '@/components';
import { colors, spacing, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetConversationsQuery, Conversation } from '@/services/conversationApi';

const TEAL = '#1a7a6e';

export default function ConversationsScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);

  const { data, isLoading, isFetching, refetch } = useGetConversationsQuery(
    { patientId: patient?._id ?? '', limit: 30 },
    { skip: !patient?._id },
  );

  useFocusEffect(
    useCallback(() => {
      if (patient?._id) refetch();
    }, [patient?._id, refetch]),
  );

  // Only show appointment-linked doctor conversations
  const conversations = (data?.data ?? []).filter((c) => c.type !== 'ai_intake');

  const renderItem = ({ item }: { item: Conversation }) => {
    const doctorName = item.doctorId?.name ?? 'Doctor';
    const serviceName = (item.appointmentId as any)?.serviceId?.name;
    const scheduledAt = (item.appointmentId as any)?.scheduledAt;
    const subtitle = serviceName
      ? serviceName
      : scheduledAt
      ? new Date(scheduledAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(patient)/conversations/${item._id}`)}
        activeOpacity={0.8}
        style={styles.row}
      >
        <Avatar name={doctorName} size={44} />

        <View style={styles.info}>
          <View style={styles.infoTop}>
            <Text style={styles.convName} numberOfLines={1}>{doctorName}</Text>
            <Text style={styles.convDate}>
              {new Date(item.updatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
              })}
            </Text>
          </View>
          {subtitle ? (
            <Text style={styles.convSubtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>

        {item.unreadCount && item.unreadCount > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 9 ? '9+' : item.unreadCount}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={TEAL} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isFetching}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={44} color={colors.gray300} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Messages with your doctor will appear here after booking an appointment.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: TEAL,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  loader: { marginTop: spacing['3xl'] },

  list: { paddingVertical: spacing.sm, paddingBottom: spacing['2xl'] },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  info: { flex: 1 },
  infoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  convName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  convDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  convSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.base + 44 + spacing.md,
  },
  unreadBadge: {
    backgroundColor: TEAL,
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },

  empty: {
    alignItems: 'center',
    marginTop: spacing['4xl'],
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
