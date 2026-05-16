import { api } from './api';

export type FrequencyScore = 0 | 1 | 2 | 3;

export interface HealthIntakeInfo {
  // Visit reason
  chiefComplaint: string;
  symptomDuration?: string;
  symptomSeverity?: number; // 0–10
  currentSymptoms?: string[];
  additionalSymptomDetail?: string;

  // Vitals
  heightFt?: number;
  heightIn?: number;
  weightLbs?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;

  // Medications & allergies
  currentMedications?: string;
  noKnownMedications?: boolean;
  medicationAllergies?: string;
  noKnownAllergies?: boolean;
  otherAllergies?: string;

  // Medical history
  chronicConditions?: string[];
  otherConditions?: string;
  previousSurgeries?: string;
  recentHospitalization?: boolean;
  recentHospitalizationDetails?: string;
  familyHistoryConditions?: string[];

  // Lifestyle
  smokingStatus?: 'never' | 'former' | 'current';
  smokingPacksPerDay?: number;
  alcoholUse?: 'none' | 'light' | 'moderate' | 'heavy';
  recreationalDrugUse?: boolean;
  recreationalDrugDetails?: string;

  // Women's health
  isPossiblyPregnant?: boolean;
  isCurrentlyPregnant?: boolean;
  lastMenstrualPeriod?: string;
  onBirthControl?: boolean;
  birthControlType?: string;

  // Mental health (PHQ-2 + GAD-2)
  phq2LittleInterest?: FrequencyScore;
  phq2FeelingDown?: FrequencyScore;
  gad2FeelingAnxious?: FrequencyScore;
  gad2UncontrollableWorry?: FrequencyScore;
  historyOfMentalHealthDiagnosis?: boolean;
  mentalHealthDiagnosisDetails?: string;

  // Safety
  feelingSafe?: boolean;
  historyOfAbuse?: boolean;

  // Additional
  additionalConcerns?: string;
}

export interface ConsentInfo {
  hasReadAndAgreed: boolean;
  signatureDate?: string;
  clientSignature?: string;
  isMinor?: boolean;
  parentGuardianName?: string;
  parentGuardianSignature?: string;
}

export interface IntakeForm {
  _id: string;
  patientId: string;
  orgId?: string;
  appointmentId?: string;
  status: 'draft' | 'completed';
  healthInfo?: HealthIntakeInfo;
  consent: ConsentInfo;
  notes?: string;
  completedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntakeFormDto {
  patientId: string;
  orgId?: string;
  appointmentId?: string;
  healthInfo?: Partial<HealthIntakeInfo>;
  consent?: Partial<ConsentInfo>;
}

export interface UpdateIntakeFormDto {
  healthInfo?: Partial<HealthIntakeInfo>;
  consent?: Partial<ConsentInfo>;
  notes?: string;
}

const intakeFormApi = api.injectEndpoints({
  endpoints: (build) => ({
    createIntakeForm: build.mutation<IntakeForm, CreateIntakeFormDto>({
      query: (body) => ({ url: '/intake-form', method: 'POST', body }),
      invalidatesTags: ['IntakeForm'],
    }),

    updateIntakeForm: build.mutation<IntakeForm, { id: string } & UpdateIntakeFormDto>({
      query: ({ id, ...body }) => ({ url: `/intake-form/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'IntakeForm', id }],
    }),

    submitIntakeForm: build.mutation<IntakeForm, { id: string } & UpdateIntakeFormDto>({
      query: ({ id, ...body }) => ({ url: `/intake-form/${id}/submit`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'IntakeForm', id }, 'IntakeForm'],
    }),

    getMyIntakeForms: build.query<IntakeForm[], void>({
      query: () => '/intake-form/my',
      providesTags: ['IntakeForm'],
    }),

    getIntakeFormById: build.query<IntakeForm, string>({
      query: (id) => `/intake-form/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'IntakeForm', id }],
    }),

    getAppointmentIntakeForms: build.query<IntakeForm[], string>({
      query: (appointmentId) => `/intake-form/appointment/${appointmentId}`,
      providesTags: (_r, _e, appointmentId) => [
        { type: 'IntakeForm', id: `appt-${appointmentId}` },
      ],
    }),
  }),
});

export const {
  useCreateIntakeFormMutation,
  useUpdateIntakeFormMutation,
  useSubmitIntakeFormMutation,
  useGetMyIntakeFormsQuery,
  useGetIntakeFormByIdQuery,
  useGetAppointmentIntakeFormsQuery,
} = intakeFormApi;
