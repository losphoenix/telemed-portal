import { api } from './api';

export interface PatientSession {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  profileImage?: string;
  policyAcceptance?: {
    acceptedAt?: string;
    ip?: string;
  };
}

export interface LoginResponse {
  access_token: string;
}

const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    generatePatientCode: build.mutation<
      { message: string },
      { email: string }
    >({
      query: (body) => ({
        url: '/auth/patient/generate-code',
        method: 'POST',
        body,
      }),
    }),

    loginPatient: build.mutation<
      LoginResponse,
      { email: string; emailCode: string }
    >({
      query: (body) => ({
        url: '/auth/patient/login',
        method: 'POST',
        body,
      }),
    }),

    getMe: build.query<PatientSession, void>({
      query: () => '/auth/patient/me',
      providesTags: ['Patient'],
    }),
  }),
});

export const {
  useGeneratePatientCodeMutation,
  useLoginPatientMutation,
  useGetMeQuery,
} = authApi;
