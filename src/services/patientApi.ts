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

const patientApi = api.injectEndpoints({
  endpoints: (build) => ({
    uploadDocument: build.mutation<
      { insurance?: Insurance; driverLicense?: DriverLicense },
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
  }),
});

export const { useUploadDocumentMutation, useUpdateDriverLicenseMutation } = patientApi;
