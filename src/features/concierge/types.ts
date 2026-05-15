export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConciergeMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  /** Set on the AI confirmation message when an appointment was booked */
  bookingInfo?: {
    appointmentId: string;
    conversationId: string;
    scheduledAt: string;
  };
}

export type ConciergeIntent =
  | 'APPOINTMENT_BOOKED'
  | 'ESCALATE'
  | 'GENERAL';

export interface IntentRoute {
  intent: ConciergeIntent;
  /** Expo Router path to navigate to after the intent is handled */
  route?: string;
  /** Extra metadata from the backend (appointmentId, conversationId, etc.) */
  data?: Record<string, string>;
}
