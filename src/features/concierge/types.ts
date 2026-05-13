export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConciergeMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export type ConciergeIntent =
  | 'BOOK'
  | 'MESSAGE'
  | 'FOLLOW_UP'
  | 'ESCALATE'
  | 'GENERAL';

export interface IntentRoute {
  intent: ConciergeIntent;
  route?: string;
  params?: Record<string, string>;
}
