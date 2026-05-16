import { createApi, fetchBaseQuery, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') + '/api';
const LOG = __DEV__; // only logs in development builds

const rawBase = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

/**
 * Thin wrapper around fetchBaseQuery that logs every request and response
 * to the Metro console (visible in the terminal running `expo start`).
 * Disabled in production builds via __DEV__.
 */
const loggingBaseQuery: typeof rawBase = async (args, api, extraOptions) => {
  if (LOG) {
    const url = typeof args === 'string' ? args : (args as FetchArgs).url;
    const method = typeof args === 'string' ? 'GET' : ((args as FetchArgs).method ?? 'GET');
    const body = typeof args === 'string' ? undefined : (args as FetchArgs).body;
    console.group?.(`[API] ${method} ${BASE_URL}${url}`);
    if (body !== undefined) console.log('[API] body →', JSON.stringify(body, null, 2));
  }

  const result = await rawBase(args, api, extraOptions);

  if (LOG) {
    if (result.error) {
      console.error('[API] error ←', result.error);
    } else {
      console.log('[API] data  ←', JSON.stringify(result.data, null, 2));
    }
    console.groupEnd?.();
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: loggingBaseQuery,
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
    'AiSession',
    'IntakeForm',
  ],
  endpoints: () => ({}),
});
