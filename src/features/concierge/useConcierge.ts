import { useState, useCallback, useRef } from 'react';
import { ConciergeMessage, ConciergeIntent, IntentRoute } from './types';
import { useAppSelector } from '@/store/hooks';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8081';

// Local keyword-based intent detection (runs before the AI reply)
function detectIntent(text: string): ConciergeIntent {
  const lower = text.toLowerCase();
  const emergency = ['emergency', 'chest pain', '911', 'cant breathe', "can't breathe", 'severe'];
  if (emergency.some((kw) => lower.includes(kw))) return 'ESCALATE';
  if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) return 'BOOK';
  if (lower.includes('message') || lower.includes('doctor') || lower.includes('question')) return 'MESSAGE';
  if (lower.includes('follow') || lower.includes('check-in')) return 'FOLLOW_UP';
  return 'GENERAL';
}

export function useConcierge() {
  const { token, patient } = useAppSelector((s) => s.auth);

  const [messages, setMessages] = useState<ConciergeMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi! I'm your AI care assistant. I can help you book an appointment, send a message to your doctor, or answer questions about your care. What's on your mind?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [intent, setIntent] = useState<IntentRoute | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const detectedIntent = detectIntent(text);
      if (detectedIntent === 'ESCALATE') {
        setIntent({ intent: 'ESCALATE' });
        return;
      }
      if (detectedIntent === 'BOOK') {
        setIntent({ intent: 'BOOK', route: '/(patient)/appointments/book' });
      } else if (detectedIntent === 'MESSAGE') {
        setIntent({ intent: 'MESSAGE', route: '/(patient)/conversations/index' });
      }

      const userMsg: ConciergeMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const assistantMsgId = (Date.now() + 1).toString();
      const assistantMsg: ConciergeMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(true);

      try {
        abortRef.current = new AbortController();

        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch(`${API_BASE}/concierge/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: text,
            patientId: patient?._id,
            history,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error('Request failed');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // SSE format: "data: <token>\n\n"
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const token = line.slice(6);
              if (token === '[DONE]') break;
              accumulated += token;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: accumulated }
                    : m,
                ),
              );
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
          ),
        );
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: "I'm having trouble connecting. Please try again.",
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, token, patient],
  );

  const clearIntent = useCallback(() => setIntent(null), []);
  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { messages, isLoading, intent, sendMessage, clearIntent, stop };
}
