import { api } from './api';

export interface Appointment {
  _id: string;
  orgId: string;
  patientId: string;
  doctorId: { _id: string; name: string; specialty?: string };
  serviceId: { _id: string; name: string; duration: number; deliveryMode: string };
  roomId?: { _id: string; name: string };
  scheduledAt: string;
  duration: number;
  status: string;
  deliveryMode: string;
  videoLink?: string;
  notes?: string;
  remindersSent?: string[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface CreateAppointmentDto {
  orgId: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  roomId?: string;
  scheduledAt: string;
  duration: number;
  deliveryMode: string;
  notes?: string;
  data?: Record<string, any>;
}

const appointmentApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAppointments: build.query<
      { data: Appointment[]; total: number },
      { orgId: string; limit?: number; offset?: number }
    >({
      query: ({ orgId, limit = 20, offset = 0 }) =>
        `/appointment?orgId=${orgId}&limit=${limit}&offset=${offset}`,
      providesTags: ['Appointment'],
    }),

    getAppointmentsByPatient: build.query<
      { data: Appointment[]; total: number },
      { patientId: string; limit?: number; offset?: number }
    >({
      query: ({ patientId, limit = 20, offset = 0 }) =>
        `/appointment/patient/${patientId}?limit=${limit}&offset=${offset}`,
      providesTags: ['Appointment'],
    }),

    getAppointment: build.query<Appointment, string>({
      query: (id) => `/appointment/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Appointment', id }],
    }),

    getAvailableSlots: build.query<
      TimeSlot[],
      { doctorId: string; date: string; duration?: number; workStart?: string; workEnd?: string }
    >({
      query: ({ doctorId, date, duration = 30, workStart = '09:00', workEnd = '17:00' }) =>
        `/appointment/slots/${doctorId}?date=${date}&duration=${duration}&workStart=${workStart}&workEnd=${workEnd}`,
    }),

    createAppointment: build.mutation<Appointment, CreateAppointmentDto>({
      query: (body) => ({
        url: '/appointment',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Appointment'],
    }),

    cancelAppointment: build.mutation<Appointment, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/appointment/${id}/cancel`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: ['Appointment'],
    }),
  }),
});

export const {
  useGetAppointmentsQuery,
  useGetAppointmentsByPatientQuery,
  useGetAppointmentQuery,
  useGetAvailableSlotsQuery,
  useCreateAppointmentMutation,
  useCancelAppointmentMutation,
} = appointmentApi;
