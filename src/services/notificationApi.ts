import { api } from './api';

export interface NotificationItem {
  _id: string;
  type: string;
  channel: string;
  recipient: { name: string; email?: string };
  subject?: string;
  body?: string;
  status: string;
  scheduledFor: string;
  sentAt?: string;
  createdAt: string;
}

const notificationApi = api.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<
      NotificationItem[],
      { orgId: string; limit?: number }
    >({
      query: ({ orgId, limit = 30 }) =>
        `/notification?orgId=${orgId}&limit=${limit}`,
      providesTags: ['Notification'],
    }),
  }),
});

export const { useGetNotificationsQuery } = notificationApi;
