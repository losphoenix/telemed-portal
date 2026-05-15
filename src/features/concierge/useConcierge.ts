import { useState, useCallback, useRef, useEffect } from 'react';
import { ConciergeMessage, IntentRoute } from './types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCredentials } from '@/store/authSlice';
import {
  useSendConciergeMessageMutation,
  useGetSessionQuery,
} from '@/services/conciergeApi';
import { useGetMeQuery } from '@/services/authApi';

let msgCounter = 0;
const nextId = () => `msg_${++msgCounter}_${Date.now()}`;

const WELCOME: ConciergeMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your AI Care Assistant. I can help you book an appointment or answer general health questions. How are you feeling today?",
  timestamp: new Date(),
};

/**
 * @param initialSessionId  Pass a session ID to restore a specific past session.
 *                          Omit to start fresh (a new session will be created on first message).
 */
export function useConcierge(initialSessionId?: string) {
  const dispatch = useAppDispatch();
  const { patient: patientFromStore, token } = useAppSelector((s) => s.auth);

  // If the store doesn't have patient (e.g. after token restore without profile fetch),
  // fetch it from the API and populate the store so all other screens benefit too.
  const { data: patientFromApi } = useGetMeQuery(undefined, {
    skip: !!patientFromStore?._id || !token,
  });
  useEffect(() => {
    if (patientFromApi && token && !patientFromStore?._id) {
      dispatch(setCredentials({ token, patient: patientFromApi }));
    }
  }, [patientFromApi, token, patientFromStore, dispatch]);

  const patient = patientFromStore ?? patientFromApi;

  // Decode patientId directly from JWT as ultimate fallback so we never
  // silently drop messages when the Redux patient object hasn't loaded yet.
  const patientId =
    patient?._id ??
    (() => {
      try {
        return JSON.parse(atob(token!.split('.')[1])).id as string;
      } catch {
        return null;
      }
    })();

  const [messages, setMessages] = useState<ConciergeMessage[]>([WELCOME]);
  const [intent, setIntent] = useState<IntentRoute | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [isRestored, setIsRestored] = useState(false);

  // Use refs to avoid stale closures inside the send callback
  const sessionIdRef = useRef<string | undefined>(initialSessionId);
  const pendingMessageRef = useRef<string | null>(null);
  const abortedRef = useRef(false);

  const [sendConciergeMessage, { isLoading }] = useSendConciergeMessageMutation();

  // Keep ref in sync with state so _doSend always uses the latest session ID
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // ── Restore session history from server ─────────────────────────────────────
  const { data: sessionData } = useGetSessionQuery(sessionId!, {
    skip: !sessionId || isRestored,
  });

  useEffect(() => {
    if (!sessionData || isRestored) return;

    const restored: ConciergeMessage[] = [WELCOME];
    for (const m of sessionData.history) {
      if (m.role === 'user' || m.role === 'assistant') {
        restored.push({
          id: nextId(),
          role: m.role as 'user' | 'assistant',
          content: typeof m.content === 'string' ? m.content : '',
          timestamp: new Date(),
        });
      }
    }

    if (restored.length > 1) {
      setMessages(restored);
    }
    setIsRestored(true);
  }, [sessionData, isRestored]);

  // ── Send pending message when loading finishes ──────────────────────────────
  // (handles the case where the user typed while the previous reply was in-flight)
  useEffect(() => {
    if (!isLoading && pendingMessageRef.current) {
      const queued = pendingMessageRef.current;
      pendingMessageRef.current = null;
      _doSend(queued);
    }
    // _doSend is stable via ref — intentionally not in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ── Core send logic (extracted so it can be called recursively for queue) ──
  const _doSendRef = useRef<(text: string) => Promise<void>>(() => Promise.resolve());

  _doSendRef.current = async (text: string) => {
    abortedRef.current = false;

    const userMsg: ConciergeMessage = {
      id: nextId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const placeholderId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: placeholderId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true },
    ]);

    try {
      const result = await sendConciergeMessage({
        patientId: patientId!,
        sessionId: sessionIdRef.current,
        message: text,
      }).unwrap();

      if (abortedRef.current) return;

      // Persist the session ID so the next message continues the same session
      setSessionId(result.sessionId);
      sessionIdRef.current = result.sessionId;

      const aiMsg: ConciergeMessage = {
        id: placeholderId,
        role: 'assistant',
        content: result.reply,
        timestamp: new Date(),
        isStreaming: false,
        ...(result.intent?.type === 'APPOINTMENT_BOOKED' && result.intent.appointmentId
          ? {
              bookingInfo: {
                appointmentId: result.intent.appointmentId,
                conversationId: result.intent.conversationId ?? '',
                scheduledAt: result.intent.scheduledAt ?? '',
              },
            }
          : {}),
      };

      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? aiMsg : m)));

      if (result.intent?.type === 'ESCALATE') {
        setIntent({ intent: 'ESCALATE' });
      } else if (result.intent?.type === 'APPOINTMENT_BOOKED') {
        setIntent({
          intent: 'APPOINTMENT_BOOKED',
          route: '/(patient)/appointments',
          data: {
            appointmentId: result.intent.appointmentId ?? '',
            conversationId: result.intent.conversationId ?? '',
          },
        });
      }
    } catch {
      if (abortedRef.current) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content: "I'm having trouble connecting right now. Please try again in a moment.",
                isStreaming: false,
              }
            : m,
        ),
      );
    }
  };

  const _doSend = useCallback((text: string) => {
    return _doSendRef.current!(text);
  }, []);

  // ── Public send — queues if already in-flight ───────────────────────────────
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      if (!patientId) {
        // Patient ID not available at all (not logged in)
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant' as const,
            content: 'Unable to identify your account. Please sign out and sign in again.',
            timestamp: new Date(),
          },
        ]);
        return;
      }

      if (isLoading) {
        // Queue for delivery once the current response finishes
        pendingMessageRef.current = text;
        return;
      }

      _doSend(text);
    },
    [patientId, isLoading, _doSend],
  );

  // ── Session management ──────────────────────────────────────────────────────
  const startNewSession = useCallback(() => {
    setSessionId(undefined);
    sessionIdRef.current = undefined;
    setMessages([WELCOME]);
    setIntent(null);
    setIsRestored(false);
    pendingMessageRef.current = null;
    abortedRef.current = false;
  }, []);

  const loadSession = useCallback((id: string) => {
    setSessionId(id);
    sessionIdRef.current = id;
    setMessages([WELCOME]);
    setIntent(null);
    setIsRestored(false);
    pendingMessageRef.current = null;
    abortedRef.current = false;
  }, []);

  const clearIntent = useCallback(() => setIntent(null), []);

  const stop = useCallback(() => {
    abortedRef.current = true;
    pendingMessageRef.current = null;
  }, []);

  return {
    messages,
    isLoading,
    intent,
    sessionId,
    sendMessage,
    clearIntent,
    stop,
    startNewSession,
    loadSession,
  };
}
