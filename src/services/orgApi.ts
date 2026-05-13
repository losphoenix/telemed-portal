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
}

export interface Service {
  _id: string;
  name: string;
  description?: string;
  duration: number;
  price?: number;
  copayAmount?: number;
  deliveryMode: 'in-person' | 'telehealth' | 'both';
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
    getOrg: build.query<Organization, string>({
      query: (id) => `/organization/${id}`,
      providesTags: ['Organization'],
    }),

    getServices: build.query<Service[], string>({
      query: (orgId) => `/service?orgId=${orgId}`,
      providesTags: ['Service'],
    }),

    getDoctors: build.query<Doctor[], string>({
      query: (orgId) => `/user/doctors?orgId=${orgId}`,
      providesTags: ['Doctor'],
    }),
  }),
});

export const { useGetOrgQuery, useGetServicesQuery, useGetDoctorsQuery } = orgApi;
