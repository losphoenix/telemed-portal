import { api } from './api';

export interface VideoSession {
  _id: string;
  roomName: string;
  roomUrl: string;       // wss://... LiveKit server URL
  patientToken: string;  // JWT access token for the patient
  doctorToken: string;   // JWT access token for the doctor
  status: string;
}

const videoSessionApi = api.injectEndpoints({
  endpoints: (build) => ({
    getVideoSessionByAppointment: build.query<VideoSession, string>({
      query: (appointmentId) => `/video-session/appointment/${appointmentId}`,
    }),
    joinVideoSession: build.mutation<VideoSession, string>({
      query: (sessionId) => ({
        url: `/video-session/${sessionId}/join`,
        method: 'PATCH',
      }),
    }),
  }),
});

export const {
  useGetVideoSessionByAppointmentQuery,
  useJoinVideoSessionMutation,
} = videoSessionApi;
