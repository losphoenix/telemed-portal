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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useConcierge } from '@/features/concierge/useConcierge';
import { MessageBubble } from '@/features/concierge/MessageBubble';
import { colors, spacing, radius, typography } from '@/theme';

const STARTER_PROMPTS = [
  'I need to book an appointment',
  'I have a question after my visit',
  "I'm not feeling well",
  'What are my upcoming visits?',
];

export default function ConciergeScreen() {
  const router = useRouter();
  const { messages, isLoading, intent, sendMessage, clearIntent, stop } = useConcierge();
  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList>(null);
  const [showStarters, setShowStarters] = useState(true);

  // Handle intent routing
  useEffect(() => {
    if (!intent) return;

    if (intent.intent === 'ESCALATE') {
      Alert.alert(
        '🚨 Emergency?',
        'If this is a medical emergency, call 911 immediately. For urgent but non-emergency care, contact the clinic directly.',
        [
          { text: 'Call 911', style: 'destructive', onPress: () => {} },
          { text: 'Contact clinic', onPress: () => clearIntent() },
          { text: 'Dismiss', style: 'cancel', onPress: () => clearIntent() },
        ],
      );
      return;
    }

    if (intent.route) {
      // Small delay so the user sees the AI is routing them
      const t = setTimeout(() => {
        clearIntent();
        router.push(intent.route as any);
      }, 1500);
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

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiHeaderIcon}>
            <Ionicons name="sparkles" size={18} color={colors.white} />
          </View>
          <View>
            <Text style={typography.h4}>AI Care Assistant</Text>
            <Text style={[typography.caption, { color: colors.success }]}>
              Always available
            </Text>
          </View>
        </View>
        {isLoading && (
          <TouchableOpacity onPress={stop} style={styles.stopBtn}>
            <Ionicons name="stop-circle-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
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

        {/* Input bar */}
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
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={!inputText.trim() || isLoading ? colors.gray400 : colors.white}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
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
  aiHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    padding: spacing.xs,
  },
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
});
