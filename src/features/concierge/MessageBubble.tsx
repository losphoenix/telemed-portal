import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConciergeMessage } from './types';
import { colors, spacing, radius } from '@/theme';

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
      <View style={styles.assistantColumn}>
        {/* Typing indicator when waiting for response */}
        {message.isStreaming && message.content === '' ? (
          <View style={[styles.bubble, styles.assistantBubble]}>
            <View style={styles.typingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        ) : (
          <View style={[styles.bubble, styles.assistantBubble]}>
            <Text style={styles.assistantText}>{message.content}</Text>
          </View>
        )}

        {/* Booking confirmation card — appears below the text when booking succeeds */}
        {message.bookingInfo?.scheduledAt ? (
          <View style={styles.bookingCard}>
            <View style={styles.bookingCardIcon}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
            <View style={styles.bookingCardText}>
              <Text style={styles.bookingCardTitle}>Appointment booked</Text>
              <Text style={styles.bookingCardDate}>
                {new Date(message.bookingInfo.scheduledAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ) : null}
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
  assistantColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xl,
  },
  userBubble: {
    backgroundColor: colors.bubblePatient,
    borderBottomRightRadius: radius.sm,
    alignSelf: 'flex-end',
    maxWidth: '90%',
  },
  assistantBubble: {
    backgroundColor: colors.bubbleAi,
    borderBottomLeftRadius: radius.sm,
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
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bookingCardIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingCardText: {
    flex: 1,
    gap: 2,
  },
  bookingCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
  bookingCardDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
