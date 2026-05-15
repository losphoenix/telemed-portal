import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useConcierge } from '@/features/concierge/useConcierge';
import { MessageBubble } from '@/features/concierge/MessageBubble';
import { useGetPatientSessionsQuery } from '@/services/conciergeApi';
import { useAppSelector } from '@/store/hooks';
import { colors, spacing, radius, typography } from '@/theme';

const STARTER_PROMPTS = [
  'I need to book an appointment',
  'I have a question after my visit',
  "I'm not feeling well",
  'What are my upcoming visits?',
];

function formatSessionDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sessionPreview(session: any) {
  if (session.aiSummary) return session.aiSummary;
  const firstUser = session.history?.find((m: any) => m.role === 'user');
  return firstUser?.content || 'New conversation';
}

function statusColor(status: string) {
  if (status === 'booked') return colors.success;
  if (status === 'closed') return colors.gray400;
  return colors.primary;
}

function statusLabel(status: string) {
  if (status === 'booked') return 'Booked';
  if (status === 'closed') return 'Closed';
  return 'Active';
}

export default function ConciergeScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showStarters, setShowStarters] = useState(true);
  const listRef = useRef<FlatList>(null);

  const {
    messages,
    isLoading,
    intent,
    sessionId,
    sendMessage,
    clearIntent,
    stop,
    startNewSession,
    loadSession,
  } = useConcierge();

  const { data: sessions = [], isLoading: loadingSessions } = useGetPatientSessionsQuery(
    patient?._id ?? '',
    { skip: !patient?._id || !historyVisible },
  );

  // Handle intent routing
  useEffect(() => {
    if (!intent) return;

    if (intent.intent === 'ESCALATE') {
      Alert.alert(
        'Emergency?',
        'If this is a medical emergency, call 911 immediately. For urgent but non-emergency care, contact the clinic directly.',
        [
          { text: 'Call 911', style: 'destructive', onPress: () => {} },
          { text: 'Contact clinic', onPress: () => clearIntent() },
          { text: 'Dismiss', style: 'cancel', onPress: () => clearIntent() },
        ],
      );
      return;
    }

    if (intent.intent === 'APPOINTMENT_BOOKED' && intent.route) {
      const t = setTimeout(() => {
        clearIntent();
        router.push(intent.route as any);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [intent, router, clearIntent]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setShowStarters(false);
    setInputText('');
    sendMessage(text);
  };

  const handleStarter = (prompt: string) => {
    setShowStarters(false);
    sendMessage(prompt);
  };

  const handleNewChat = () => {
    startNewSession();
    setShowStarters(true);
    setInputText('');
    setHistoryVisible(false);
  };

  const handleLoadSession = (id: string) => {
    loadSession(id);
    setShowStarters(false);
    setInputText('');
    setHistoryVisible(false);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiHeaderIcon}>
            <Ionicons name="sparkles" size={18} color={colors.white} />
          </View>
          <View>
            <Text style={typography.h4}>AI Care Assistant</Text>
            <Text style={[typography.caption, { color: colors.success }]}>Always available</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isLoading && (
            <TouchableOpacity onPress={stop} style={styles.headerBtn}>
              <Ionicons name="stop-circle-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleNewChat} style={styles.headerBtn}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setHistoryVisible(true)} style={styles.headerBtn}>
            <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Message list ── */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            showStarters ? (
              <View style={styles.starters}>
                {STARTER_PROMPTS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.starterChip}
                    onPress={() => handleStarter(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.starterText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />

        {/* ── Input bar ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask anything about your care…"
            placeholderTextColor={colors.gray400}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons
                name="arrow-up"
                size={18}
                color={!inputText.trim() ? colors.gray400 : colors.white}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Session history modal ── */}
      <Modal
        visible={historyVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHistoryVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={typography.h3}>Chat History</Text>
            <TouchableOpacity onPress={() => setHistoryVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* New chat button */}
          <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>

          {loadingSessions ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="chatbubble-outline" size={48} color={colors.gray400} />
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                No past conversations
              </Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(s) => s._id}
              contentContainerStyle={{ paddingBottom: spacing.xl }}
              renderItem={({ item }) => {
                const isActive = item._id === sessionId;
                return (
                  <TouchableOpacity
                    style={[styles.sessionItem, isActive && styles.sessionItemActive]}
                    onPress={() => handleLoadSession(item._id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sessionRow}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
                      <View style={styles.sessionInfo}>
                        <View style={styles.sessionMeta}>
                          <Text style={styles.sessionDate}>{formatSessionDate(item.createdAt)}</Text>
                          <Text style={[styles.sessionStatus, { color: statusColor(item.status) }]}>
                            {statusLabel(item.status)}
                          </Text>
                        </View>
                        <Text style={styles.sessionPreview} numberOfLines={2}>
                          {sessionPreview(item)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },

  // Header
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aiHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtn: {
    padding: spacing.xs,
  },

  // Messages
  messageList: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  starters: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  starterChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  starterText: {
    fontSize: 14,
    color: colors.textPrimary,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 120,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.gray200,
  },

  // History modal
  modalSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.base,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  newChatText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionItem: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionItemActive: {
    borderColor: colors.primary,
    backgroundColor: '#f0f5ff',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sessionStatus: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionPreview: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
