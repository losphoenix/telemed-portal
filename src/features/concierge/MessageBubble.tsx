import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConciergeMessage } from './types';
import { colors, spacing, radius, typography } from '@/theme';

interface MessageBubbleProps {
  message: ConciergeMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <View style={styles.aiAvatar}>
        <Ionicons name="sparkles" size={14} color={colors.ai} />
      </View>
      <View style={[styles.bubble, styles.assistantBubble]}>
        {message.isStreaming && message.content === '' ? (
          <View style={styles.typingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        ) : (
          <Text style={styles.assistantText}>
            {message.content}
            {message.isStreaming ? '▋' : ''}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    marginVertical: spacing.xs,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    marginVertical: spacing.xs,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xl,
  },
  userBubble: {
    backgroundColor: colors.bubblePatient,
    borderBottomRightRadius: radius.sm,
  },
  assistantBubble: {
    backgroundColor: colors.bubbleAi,
    borderBottomLeftRadius: radius.sm,
    flex: 1,
  },
  userText: {
    color: colors.bubblePatientText,
    fontSize: 15,
    lineHeight: 21,
  },
  assistantText: {
    color: colors.bubbleAiText,
    fontSize: 15,
    lineHeight: 22,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.aiLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.ai,
    opacity: 0.4,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
});
