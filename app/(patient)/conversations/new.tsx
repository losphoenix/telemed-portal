import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useCreateConversationMutation } from '@/services/conversationApi';

const TEAL = '#1a7a6e';

type MessageType = 'medical' | 'admin' | 'support';

interface TypeConfig {
  icon: string;
  iconBg: string;
  label: string;
  description: string;
  placeholder: string;
}

const TYPE_CONFIG: Record<MessageType, TypeConfig> = {
  medical: {
    icon: 'medkit-outline',
    iconBg: '#e8f4f2',
    label: 'Medical Question',
    description: 'Send a message to your care team',
    placeholder: 'Describe your question or concern…',
  },
  admin: {
    icon: 'people-outline',
    iconBg: '#fff8e6',
    label: 'Admin Team',
    description: 'Billing, insurance, or account questions',
    placeholder: 'Describe your billing or account question…',
  },
  support: {
    icon: 'build-outline',
    iconBg: '#f0f4ff',
    label: 'Technical Support',
    description: 'App issues or technical help',
    placeholder: 'Describe the issue you are experiencing…',
  },
};

export default function NewConversationScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { patient } = useAppSelector((s) => s.auth);

  const messageType: MessageType =
    type === 'admin' || type === 'support' ? type : 'medical';

  const config = TYPE_CONFIG[messageType];

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [createConversation, { isLoading }] = useCreateConversationMutation();

  const canSend = subject.trim().length > 0 && message.trim().length > 0;

  const handleSend = async () => {
    if (!canSend || isLoading) return;
    try {
      const result = await createConversation({
        subject: subject.trim(),
        type: messageType,
        initialMessage: message.trim(),
      }).unwrap();
      // Navigate to the newly created conversation
      router.replace(`/(patient)/conversations/${result._id}`);
    } catch {
      Alert.alert('Failed to send', 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type badge */}
          <View style={styles.typeBadge}>
            <View style={[styles.typeIconWrap, { backgroundColor: config.iconBg }]}>
              <Ionicons name={config.icon as any} size={22} color={TEAL} />
            </View>
            <View style={styles.typeTextWrap}>
              <Text style={styles.typeLabel}>{config.label}</Text>
              <Text style={styles.typeDesc}>{config.description}</Text>
            </View>
          </View>

          {/* Subject */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter a subject…"
              placeholderTextColor={colors.gray400}
              value={subject}
              onChangeText={setSubject}
              maxLength={120}
              returnKeyType="next"
            />
          </View>

          {/* Message */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.fieldInput, styles.messageInput]}
              placeholder={config.placeholder}
              placeholderTextColor={colors.gray400}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{message.length}/2000</Text>
          </View>

          {/* Info note */}
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.noteText}>
              {messageType === 'medical'
                ? 'Your care team will respond within 1 business day. For urgent concerns, please call our office.'
                : messageType === 'admin'
                ? 'Our admin team will respond within 1–2 business days for billing and account questions.'
                : 'Technical support will respond within 1 business day. Screenshots help us assist you faster.'}
            </Text>
          </View>
        </ScrollView>

        {/* Send button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={!canSend || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="send" size={18} color={colors.white} />
                <Text style={styles.sendBtnText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TEAL,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
    paddingBottom: spacing['2xl'],
  },

  // Type badge
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  typeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  typeTextWrap: { flex: 1 },
  typeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  typeDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Fields
  field: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  messageInput: {
    minHeight: 120,
  },
  charCount: {
    fontSize: 11,
    color: colors.textDisabled,
    textAlign: 'right',
  },

  // Note
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Footer
  footer: {
    padding: spacing.base,
    paddingBottom: spacing.base,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: TEAL,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
  },
  sendBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
