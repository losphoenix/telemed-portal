import { api } from './api';

export interface Appointment {
  _id: string;
  orgId: string;
  patientId: string;
  doctorId: { _id: string; name: string; specialty?: string };
  serviceId: { _id: string; name: string; defaultDuration: number; deliveryMode: string };
  roomId?: { _id: string; name: string };
  scheduledAt: string;
  duration: number;
  priceAtBooking: number;
  status: string;
  deliveryMode: string;
  videoLink?: string;
  notes?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DoctorSlots {
  doctorId: string;
  doctorName: string;
  orgId: string;
  specialty?: string;
  price: number;
  duration: number;
  deliveryMode: string;
  orgTimezone: string;
  slots: TimeSlot[];
}

export interface BookAppointmentDto {
  serviceId: string;
  doctorId: string;
  orgId: string;
  patientId: string;
  scheduledAt: string;
  notes?: string;
  intakeFormData?: Record<string, any>;
}

const appointmentApi = api.injectEndpoints({
  endpoints: (build) => ({
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
      DoctorSlots[],
      { serviceId: string; date: string; orgId?: string }
    >({
      query: ({ serviceId, date, orgId }) => ({
        url: `/appointment/slots/service/${serviceId}`,
        params: {
          date,
          ...(orgId && { orgId }),
        },
      }),
    }),

    bookAppointment: build.mutation<Appointment, BookAppointmentDto>({
      query: (body) => ({
        url: '/appointment/book',
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
  useGetAppointmentsByPatientQuery,
  useGetAppointmentQuery,
  useGetAvailableSlotsQuery,
  useBookAppointmentMutation,
  useCancelAppointmentMutation,
} = appointmentApi;
