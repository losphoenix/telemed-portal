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
  doctorId?: { _id: string; name: string };
  appointmentId?: string;
  type?: string;
  status: string;
  subject?: string;
  unreadCount?: number;
  lastMessage?: string;
  updatedAt: string;
}

export interface CreateConversationDto {
  orgId?: string;
  subject: string;
  type: 'medical' | 'admin' | 'support';
  initialMessage: string;
}

const conversationApi = api.injectEndpoints({
  endpoints: (build) => ({
    getConversations: build.query<
      { data: Conversation[]; total: number },
      { orgId: string; limit?: number; offset?: number }
    >({
      query: ({ orgId, limit = 20, offset = 0 }) =>
        `/conversation?orgId=${orgId}&limit=${limit}&offset=${offset}`,
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
      { conversationId: string; content: string }
    >({
      query: ({ conversationId, content }) => ({
        url: `/conversation/${conversationId}/message`,
        method: 'POST',
        body: { content },
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

    createConversation: build.mutation<Conversation, CreateConversationDto>({
      query: (body) => ({
        url: '/conversation',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversation'],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkReadMutation,
  useGetUnreadCountQuery,
  useCreateConversationMutation,
} = conversationApi;
