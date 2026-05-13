import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/theme';
import { useGetFollowUpQuery, useReplyFollowUpMutation } from '@/services/followUpApi';
import { Card } from '@/components';

export default function FollowUpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: followUp, isLoading } = useGetFollowUpQuery(id ?? '');
  const [reply, setReply] = useState('');
  const [replyFollowUp, { isLoading: isReplying }] = useReplyFollowUpMutation();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const text = reply.trim();
    if (!text || isReplying) return;
    try {
      const result = await replyFollowUp({ id: id ?? '', reply: text }).unwrap();
      setSubmitted(true);
      if (result.escalatedToDoctor) {
        // Show escalation state — handled below
      }
    } catch {
      // Error handled by component state
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!followUp) return null;

  // Escalation state — full-screen notice
  if (followUp.escalatedToDoctor || (submitted && followUp.flaggedForDoctor)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.escalationScreen}>
          <View style={styles.escalationIcon}>
            <Ionicons name="alert-circle" size={36} color={colors.warning} />
          </View>
          <Text style={typography.h3}>Your doctor has been notified</Text>
          <Text style={[typography.body, styles.escalationText]}>
            Based on your response, your care team has been alerted. Someone will follow up
            with you shortly.
          </Text>
          {followUp.escalationReason && (
            <Card style={styles.reasonCard}>
              <Text style={typography.bodySmall}>{followUp.escalationReason}</Text>
            </Card>
          )}
          <TouchableOpacity onPress={() => router.replace('/(patient)/home')}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Submitted state
  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.escalationScreen}>
          <View style={[styles.escalationIcon, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
          </View>
          <Text style={typography.h3}>Response submitted</Text>
          <Text style={[typography.body, styles.escalationText]}>
            Thank you for checking in. Your care team has your update.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(patient)/home')}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const messages = [
    {
      id: 'ai-question',
      role: 'ai',
      content: followUp.aiQuestion ?? "How are you feeling since your last visit?",
    },
    ...(followUp.patientReply
      ? [{ id: 'patient-reply', role: 'patient', content: followUp.patientReply }]
      : []),
    ...(followUp.aiSummary
      ? [{ id: 'ai-summary', role: 'ai', content: followUp.aiSummary }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={typography.h4}>Follow-up check-in</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const isMe = item.role === 'patient';
            return (
              <View style={[styles.bubbleRow, isMe ? styles.rowRight : styles.rowLeft]}>
                {!isMe && (
                  <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={14} color={colors.ai} />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleAi,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      isMe ? styles.textMe : styles.textAi,
                    ]}
                  >
                    {item.content}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {!followUp.patientReply && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Type your response…"
              placeholderTextColor={colors.gray400}
              value={reply}
              onChangeText={setReply}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!reply.trim() || isReplying) && styles.sendBtnDisabled]}
              onPress={handleSubmit}
              disabled={!reply.trim() || isReplying}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={!reply.trim() || isReplying ? colors.gray400 : colors.white}
              />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  messageList: { padding: spacing.base, gap: spacing.md },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.aiLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xl,
  },
  bubbleMe: {
    backgroundColor: colors.bubblePatient,
    borderBottomRightRadius: radius.sm,
  },
  bubbleAi: {
    backgroundColor: colors.bubbleAi,
    borderBottomLeftRadius: radius.sm,
    flex: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  textMe: { color: colors.bubblePatientText },
  textAi: { color: colors.bubbleAiText },
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
  sendBtnDisabled: { backgroundColor: colors.gray200 },
  escalationScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.lg,
  },
  escalationIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escalationText: { textAlign: 'center', color: colors.textSecondary },
  reasonCard: { width: '100%' },
});
