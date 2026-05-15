import { api } from './api';

export interface ConciergeIntent {
  type: 'APPOINTMENT_BOOKED' | 'ESCALATE';
  appointmentId?: string;
  conversationId?: string;
  scheduledAt?: string;
  doctorName?: string;
}

export interface AiChatResponse {
  sessionId: string;
  reply: string;
  intent?: ConciergeIntent;
}

export interface AiChatSession {
  _id: string;
  patientId: string;
  status: 'active' | 'booked' | 'closed';
  history: { role: string; content: string }[];
  aiSummary?: string;
  appointmentId?: string;
  conversationId?: string;
  createdAt: string;
  updatedAt: string;
}

const conciergeApi = api.injectEndpoints({
  endpoints: (build) => ({
    sendConciergeMessage: build.mutation<
      AiChatResponse,
      { patientId: string; sessionId?: string; message: string }
    >({
      query: (body) => ({
        url: '/ai-chat/message',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AiSession'],
    }),

    getPatientSessions: build.query<AiChatSession[], string>({
      query: (patientId) => `/ai-chat/sessions/patient/${patientId}`,
      providesTags: ['AiSession'],
    }),

    getSession: build.query<AiChatSession, string>({
      query: (sessionId) => `/ai-chat/session/${sessionId}`,
      providesTags: (result, error, id) => [{ type: 'AiSession' as const, id }],
    }),
  }),
});

export const {
  useSendConciergeMessageMutation,
  useGetPatientSessionsQuery,
  useGetSessionQuery,
} = conciergeApi;
