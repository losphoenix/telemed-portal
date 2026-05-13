import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') + '/api';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: [
    'Patient',
    'Appointment',
    'Conversation',
    'Message',
    'FollowUp',
    'Notification',
    'Organization',
    'Service',
    'Doctor',
  ],
  endpoints: () => ({}),
});
