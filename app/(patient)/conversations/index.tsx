import React from 'react';
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
import { Card, Avatar } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetConversationsQuery, Conversation } from '@/services/conversationApi';

export default function ConversationsScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);

  const { data, isLoading, refetch } = useGetConversationsQuery(
    { orgId: '', limit: 30 },
    { skip: !patient?._id },
  );

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(patient)/conversations/${item._id}`)}
      activeOpacity={0.85}
    >
      <Card style={styles.card}>
        <View style={styles.row}>
          <Avatar name={item.doctorId?.name} size={44} />
          <View style={styles.info}>
            <Text style={typography.h4}>{item.doctorId?.name}</Text>
            {item.subject && (
              <Text style={typography.bodySmall} numberOfLines={1}>
                {item.subject}
              </Text>
            )}
            <Text style={typography.caption}>
              {new Date(item.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          {item.unreadCount && item.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 9 ? '9+' : item.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.h2}>Messages</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                No messages yet
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
  },
  loader: { marginTop: spacing['3xl'] },
  list: { padding: spacing.base, gap: spacing.md },
  card: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  empty: { alignItems: 'center', marginTop: spacing['3xl'] },
});
