import { api } from './api';

export interface DriverLicense {
  number?: string;
  state?: string;
  expiryDate?: string;
  frontUrl?: string;
  backUrl?: string;
}

export interface Insurance {
  provider?: string;
  memberId?: string;
  groupNumber?: string;
  copayAmount?: number;
  cardFrontUrl?: string;
  cardBackUrl?: string;
}

export type DocType = 'insurance-front' | 'insurance-back' | 'license-front' | 'license-back';

export interface PatientProfileUpdate {
  firstName: string;
  lastName: string;
  name: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
}

export interface PatientPcp {
  doctorId?: string | { _id: string; name: string; specialty?: string; profileImage?: string };
  name?: string;
  phone?: string;
  practice?: string;
  isExternal: boolean;
  assignedAt?: string;
}

export interface UpdatePcpDto {
  isExternal: boolean;
  doctorId?: string;
  name?: string;
  phone?: string;
  practice?: string;
}

export interface PatientFull {
  _id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  policyAcceptance?: { acceptedAt?: string; ip?: string };
  insurance?: Insurance;
  driverLicense?: DriverLicense;
  pcp?: PatientPcp;
}

const patientApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Fetch the full patient document directly from /patient/:id
    // — always returns all DB fields regardless of JWT strategy state
    getPatient: build.query<PatientFull, string>({
      query: (id) => `/patient/${id}`,
      providesTags: ['Patient'],
    }),

    uploadDocument: build.mutation<
      { patient: PatientFull; ocrFields: Record<string, string | number | null> },
      { id: string; docType: DocType; uri: string; mimeType: string; fileName: string }
    >({
      async queryFn({ id, docType, uri, mimeType, fileName }, _api, _extra, baseQuery) {
        const form = new FormData();
        form.append('docType', docType);
        form.append('file', { uri, type: mimeType, name: fileName } as any);
        const result = await baseQuery({
          url: `/patient/${id}/documents`,
          method: 'POST',
          body: form,
          formData: true,
        } as any);
        if (result.error) return { error: result.error };
        return { data: result.data as any };
      },
      invalidatesTags: ['Patient'],
    }),

    updateInsurance: build.mutation<
      void,
      { id: string; insurance: Partial<Insurance> }
    >({
      query: ({ id, insurance }) => ({
        url: `/patient/${id}`,
        method: 'PATCH',
        body: { insurance },
      }),
      invalidatesTags: ['Patient'],
    }),

    updateDriverLicense: build.mutation<
      void,
      { id: string; driverLicense: Partial<DriverLicense> }
    >({
      query: ({ id, driverLicense }) => ({
        url: `/patient/${id}`,
        method: 'PATCH',
        body: { driverLicense },
      }),
      invalidatesTags: ['Patient'],
    }),

    updateProfile: build.mutation<
      void,
      { id: string } & PatientProfileUpdate
    >({
      query: ({ id, ...body }) => ({
        url: `/patient/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Patient'],
    }),

    acceptPolicy: build.mutation<
      { policyAcceptance: { acceptedAt: string; ip: string } },
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/patient/${id}/accept-policy`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Patient'],
    }),

    updatePcp: build.mutation<PatientFull, { id: string } & UpdatePcpDto>({
      query: ({ id, ...body }) => ({
        url: `/patient/${id}/pcp`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Patient'],
    }),

    clearPcp: build.mutation<PatientFull, { id: string }>({
      query: ({ id }) => ({
        url: `/patient/${id}/pcp`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Patient'],
    }),
  }),
});

export const {
  useGetPatientQuery,
  useUploadDocumentMutation,
  useUpdateInsuranceMutation,
  useUpdateDriverLicenseMutation,
  useUpdateProfileMutation,
  useAcceptPolicyMutation,
  useUpdatePcpMutation,
  useClearPcpMutation,
} = patientApi;
