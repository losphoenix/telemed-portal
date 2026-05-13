import { api } from './api';

export interface FollowUp {
  _id: string;
  orgId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  status: string;
  scheduledFor: string;
  aiQuestion?: string;
  patientReply?: string;
  aiSummary?: string;
  flaggedForDoctor: boolean;
  escalatedToDoctor: boolean;
  escalationReason?: string;
}

const followUpApi = api.injectEndpoints({
  endpoints: (build) => ({
    getFollowUpsByPatient: build.query<FollowUp[], string>({
      query: (patientId) => `/follow-up?patientId=${patientId}`,
      providesTags: ['FollowUp'],
    }),

    getFollowUp: build.query<FollowUp, string>({
      query: (id) => `/follow-up/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'FollowUp', id }],
    }),

    replyFollowUp: build.mutation<FollowUp, { id: string; reply: string }>({
      query: ({ id, reply }) => ({
        url: `/follow-up/${id}/reply`,
        method: 'POST',
        body: { reply },
      }),
      invalidatesTags: (_result, _err, { id }) => [{ type: 'FollowUp', id }, 'FollowUp'],
    }),
  }),
});

export const {
  useGetFollowUpsByPatientQuery,
  useGetFollowUpQuery,
  useReplyFollowUpMutation,
} = followUpApi;
