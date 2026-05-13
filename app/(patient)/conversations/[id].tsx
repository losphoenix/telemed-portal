import React, { useEffect, useRef, useState } from 'react';
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
import { useAppSelector } from '@/store/hooks';
import {
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkReadMutation,
  Message,
} from '@/services/conversationApi';

function MessageBubble({ message, myId }: { message: Message; myId: string }) {
  const isMe = message.senderId === myId;
  const isAi = message.senderType === 'ai';

  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      {isAi && (
        <View style={styles.aiTag}>
          <Text style={styles.aiTagText}>AI</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isMe ? styles.bubbleMe : isAi ? styles.bubbleAi : styles.bubbleDoctor,
        ]}
      >
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
          {message.content}
        </Text>
        <Text style={[styles.bubbleTime, isMe ? { color: 'rgba(255,255,255,0.6)' } : {}]}>
          {new Date(message.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const { data, isLoading, refetch } = useGetMessagesQuery(
    { conversationId: id ?? '', limit: 100 },
    { skip: !id, pollingInterval: 5000 },
  );

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [markRead] = useMarkReadMutation();

  useEffect(() => {
    if (id && patient?._id) {
      markRead({ conversationId: id, userId: patient._id });
    }
  }, [id, patient?._id]);

  useEffect(() => {
    if (data?.data?.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [data?.data?.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    try {
      await sendMessage({ conversationId: id ?? '', content: text }).unwrap();
    } catch {
      setInput(text);
    }
  };

  const messages = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={typography.h4}>Conversation</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m._id}
            renderItem={({ item }) => (
              <MessageBubble message={item} myId={patient?._id ?? ''} />
            )}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onRefresh={refetch}
            refreshing={isLoading}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message…"
            placeholderTextColor={colors.gray400}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isSending}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={!input.trim() || isSending ? colors.gray400 : colors.white}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  loader: { flex: 1, marginTop: spacing['3xl'] },
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
  messageList: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  bubbleRow: {
    marginVertical: spacing.xs / 2,
  },
  bubbleRowLeft: { alignItems: 'flex-start', paddingLeft: spacing.xs },
  bubbleRowRight: { alignItems: 'flex-end', paddingRight: spacing.xs },
  aiTag: {
    backgroundColor: colors.aiLight,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 3,
    alignSelf: 'flex-start',
  },
  aiTagText: { fontSize: 10, fontWeight: '700', color: colors.ai },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  bubbleMe: {
    backgroundColor: colors.bubblePatient,
    borderBottomRightRadius: radius.sm,
  },
  bubbleDoctor: {
    backgroundColor: colors.bubbleDoctor,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleAi: {
    backgroundColor: colors.bubbleAi,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: colors.bubblePatientText },
  bubbleTextOther: { color: colors.bubbleDoctorText },
  bubbleTime: { fontSize: 11, color: colors.textDisabled, marginTop: 3, textAlign: 'right' },
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
});
