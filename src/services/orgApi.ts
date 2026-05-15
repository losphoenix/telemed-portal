import { api } from './api';

export interface Organization {
  _id: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  logoUrl?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
    fax?: string;
  };
  businessHours?: Record<string, { open: string; close: string } | null>;
}

export interface Service {
  _id: string;
  name: string;
  description?: string;
  defaultDuration: number;
  deliveryMode: 'in_person' | 'telehealth' | 'both';
  category?: string;
}

export interface Doctor {
  _id: string;
  name: string;
  specialty?: string;
  bio?: string;
  profileImage?: string;
}

const orgApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOrganizations: build.query<Organization[], void>({
      query: () => '/organization',
      providesTags: ['Organization'],
    }),

    getOrg: build.query<Organization, string>({
      query: (id) => `/organization/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Organization', id }],
    }),

    getServices: build.query<Service[], void>({
      query: () => '/service',
      providesTags: ['Service'],
    }),

    getDoctors: build.query<Doctor[], string>({
      query: (orgId) => `/user/doctors?orgId=${orgId}`,
      providesTags: ['Doctor'],
    }),
  }),
});

export const {
  useGetOrganizationsQuery,
  useGetOrgQuery,
  useGetServicesQuery,
  useGetDoctorsQuery,
} = orgApi;
