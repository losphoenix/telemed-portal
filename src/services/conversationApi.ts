import { api } from './api';

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderType: 'patient' | 'doctor' | 'ai' | 'system';
  content: string;
  readAt?: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  orgId: string;
  patientId: string;
  doctorId?: { _id: string; name: string; specialty?: string };
  appointmentId?: {
    _id: string;
    scheduledAt: string;
    deliveryMode: string;
    serviceId?: { name: string };
  };
  type?: string;
  status: string;
  unreadCount?: number;
  lastMessage?: string;
  updatedAt: string;
}

const conversationApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Patient inbox — returns all conversations for the patient
    getConversations: build.query<
      { data: Conversation[]; total: number },
      { patientId: string; limit?: number; offset?: number }
    >({
      query: ({ patientId, limit = 30, offset = 0 }) =>
        `/conversation/patient/${patientId}?limit=${limit}&offset=${offset}`,
      providesTags: ['Conversation'],
    }),

    getMessages: build.query<
      { data: Message[]; total: number },
      { conversationId: string; limit?: number; offset?: number }
    >({
      query: ({ conversationId, limit = 50, offset = 0 }) =>
        `/conversation/${conversationId}/messages?limit=${limit}&offset=${offset}`,
      providesTags: (_result, _err, { conversationId }) => [
        { type: 'Message', id: conversationId },
      ],
    }),

    sendMessage: build.mutation<
      Message,
      { conversationId: string; content: string; senderId: string; senderType: string }
    >({
      query: ({ conversationId, content, senderId, senderType }) => ({
        url: `/conversation/${conversationId}/message`,
        method: 'POST',
        body: { content, senderId, senderType },
      }),
      invalidatesTags: (_result, _err, { conversationId }) => [
        { type: 'Message', id: conversationId },
        'Conversation',
      ],
    }),

    markRead: build.mutation<void, { conversationId: string; userId: string }>({
      query: ({ conversationId }) => ({
        url: `/conversation/${conversationId}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Conversation'],
    }),

    getUnreadCount: build.query<{ unread: number }, string>({
      query: (conversationId) => `/conversation/${conversationId}/unread`,
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkReadMutation,
  useGetUnreadCountQuery,
} = conversationApi;
