import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components';
import { colors, spacing, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetConversationsQuery, Conversation } from '@/services/conversationApi';

const TEAL = '#1a7a6e';

// ─── Compose options ──────────────────────────────────────────────────────────

interface ComposeOption {
  icon: string;
  iconBg: string;
  label: string;
  sublabel: string;
  onPress: () => void;
}

// ─── Compose bottom sheet ─────────────────────────────────────────────────────

function ComposeSheet({
  visible,
  options,
  onClose,
}: {
  visible: boolean;
  options: ComposeOption[];
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetTitle}>New Message</Text>

        {options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.composeOption,
              idx < options.length - 1 && styles.composeOptionBorder,
            ]}
            onPress={() => { onClose(); opt.onPress(); }}
            activeOpacity={0.7}
          >
            <View style={[styles.composeIconWrap, { backgroundColor: opt.iconBg }]}>
              <Ionicons name={opt.icon as any} size={20} color={TEAL} />
            </View>
            <View style={styles.composeText}>
              <Text style={styles.composeLabel}>{opt.label}</Text>
              <Text style={styles.composeSublabel}>{opt.sublabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
          </TouchableOpacity>
        ))}

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ConversationsScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, refetch } = useGetConversationsQuery(
    { orgId: '', limit: 30 },
    { skip: !patient?._id },
  );

  const composeOptions: ComposeOption[] = [
    {
      icon: 'sparkles-outline',
      iconBg: '#f0eeff',
      label: 'AI Chat',
      sublabel: 'Chat with our AI care assistant',
      onPress: () => router.push('/(patient)/concierge'),
    },
    {
      icon: 'medkit-outline',
      iconBg: '#e8f4f2',
      label: 'Medical Question',
      sublabel: 'Send a message to your care team',
      onPress: () => router.push('/(patient)/conversations/new?type=medical'),
    },
    {
      icon: 'people-outline',
      iconBg: '#fff8e6',
      label: 'Admin Team',
      sublabel: 'Billing, insurance, or account questions',
      onPress: () => router.push('/(patient)/conversations/new?type=admin'),
    },
    {
      icon: 'build-outline',
      iconBg: '#f0f4ff',
      label: 'Technical Support',
      sublabel: 'App issues or technical help',
      onPress: () => router.push('/(patient)/conversations/new?type=support'),
    },
  ];

  const renderItem = ({ item }: { item: Conversation }) => {
    const isAi = item.type === 'ai_intake';
    const displayName = isAi ? 'AI Care Assistant' : (item.doctorId?.name ?? 'Support');

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(patient)/conversations/${item._id}`)}
        activeOpacity={0.8}
        style={styles.conversationRow}
      >
        <View style={[styles.avatarWrap, isAi && styles.avatarAi]}>
          {isAi ? (
            <Ionicons name="sparkles" size={20} color="#7C3AED" />
          ) : (
            <Avatar name={displayName} size={44} />
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.infoTop}>
            <Text style={styles.convName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.convDate}>
              {new Date(item.updatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
              })}
            </Text>
          </View>
          {item.subject && (
            <Text style={styles.convSubject} numberOfLines={1}>{item.subject}</Text>
          )}
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          onPress={() => setSheetOpen(true)}
          style={styles.composeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={TEAL} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={44} color={colors.gray300} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the compose icon to start a conversation
              </Text>
            </View>
          }
        />
      )}

      {/* Compose bottom sheet */}
      <ComposeSheet
        visible={sheetOpen}
        options={composeOptions}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  composeBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 19,
  },

  loader: { marginTop: spacing['3xl'] },

  list: { paddingVertical: spacing.sm, paddingBottom: spacing['2xl'] },

  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  avatarWrap: { flexShrink: 0 },
  avatarAi: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
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
  convSubject: {
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

  // Bottom sheet
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // safe area bottom
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  composeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  composeOptionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  composeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  composeText: { flex: 1 },
  composeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  composeSublabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.gray100,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
