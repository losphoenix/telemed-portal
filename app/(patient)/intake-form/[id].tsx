import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/theme';
import {
  useGetIntakeFormByIdQuery,
  useUpdateIntakeFormMutation,
  useSubmitIntakeFormMutation,
  HealthIntakeInfo,
  ConsentInfo,
  FrequencyScore,
} from '@/services/intakeFormApi';
import { HealthProfile, useGetPatientQuery } from '@/services/patientApi';
import { useAppSelector } from '@/store/hooks';

// ── Step definitions ──────────────────────────────────────────────────────────

type Step = 'visit' | 'history' | 'lifestyle' | 'mental' | 'consent';
const STEPS: Step[] = ['visit', 'history', 'lifestyle', 'mental', 'consent'];
const STEP_LABELS: Record<Step, string> = {
  visit: 'Reason for Visit',
  history: 'Medical History',
  lifestyle: 'Lifestyle',
  mental: 'Mental Health & Safety',
  consent: 'Consent & Submit',
};

// ── Reusable UI primitives ────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function StyledInput({
  value, onChangeText, placeholder, multiline, keyboardType,
}: {
  value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.inputMulti]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textDisabled}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      keyboardType={keyboardType}
    />
  );
}

function ToggleRow({ label, value, onToggle, sublabel }: {
  label: string; value: boolean; onToggle: (v: boolean) => void; sublabel?: string;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sublabel && <Text style={styles.toggleSub}>{sublabel}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.gray200, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

function OptionGroup<T extends string>({
  label, options, value, onSelect,
}: {
  label: string; options: { label: string; value: T }[];
  value: T | ''; onSelect: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optionBtn, value === opt.value && styles.optionBtnSelected]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionBtnText, value === opt.value && styles.optionBtnTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ConditionChip({ label, selected, onPress }: {
  label: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SeveritySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={styles.severityRow}>
        {Array.from({ length: 11 }, (_, i) => {
          const color = i <= 3 ? colors.success : i <= 6 ? colors.warning : colors.danger;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onChange(i)}
              style={[styles.severityBtn, { borderColor: value === i ? color : colors.border, backgroundColor: value === i ? color : colors.white }]}
            >
              <Text style={[styles.severityBtnText, { color: value === i ? colors.white : colors.textSecondary }]}>
                {i}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.severityLabels}>
        <Text style={styles.severityLabelText}>No pain</Text>
        <Text style={styles.severityLabelText}>Worst imaginable</Text>
      </View>
    </View>
  );
}

// PHQ-2 / GAD-2 frequency picker
const FREQ_OPTIONS = [
  { label: 'Not at all', value: 0 as FrequencyScore },
  { label: 'Several days', value: 1 as FrequencyScore },
  { label: 'More than half', value: 2 as FrequencyScore },
  { label: 'Nearly every day', value: 3 as FrequencyScore },
];

function FreqPicker({ label, value, onChange }: {
  label: string; value: FrequencyScore | undefined; onChange: (v: FrequencyScore) => void;
}) {
  return (
    <View style={styles.freqBlock}>
      <Text style={styles.freqQuestion}>{label}</Text>
      <View style={styles.freqOptions}>
        {FREQ_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.freqBtn, value === opt.value && styles.freqBtnSelected]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.freqBtnText, value === opt.value && styles.freqBtnTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Condition lists ───────────────────────────────────────────────────────────

const COMMON_SYMPTOMS = [
  'Fever', 'Cough', 'Shortness of breath', 'Fatigue', 'Headache',
  'Nausea', 'Chest pain', 'Back pain', 'Joint pain', 'Dizziness',
  'Sore throat', 'Runny nose', 'Rash', 'Abdominal pain', 'Insomnia',
];

const CHRONIC_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Asthma', 'COPD', 'Heart disease',
  'Kidney disease', 'Thyroid disorder', 'Arthritis', 'Cancer',
  'HIV/AIDS', 'Epilepsy', 'Stroke', 'Obesity',
];

const FAMILY_CONDITIONS = [
  'Heart disease', 'Diabetes', 'Cancer', 'Stroke', 'Mental illness',
  'Hypertension', 'Kidney disease', 'Substance abuse',
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function IntakeFormFillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);

  const { data: form, isLoading } = useGetIntakeFormByIdQuery(id ?? '', { skip: !id });
  const [updateForm] = useUpdateIntakeFormMutation();
  const [submitForm, { isLoading: isSubmitting }] = useSubmitIntakeFormMutation();
  const patientId = patient?._id ?? '';
  const { data: me } = useGetPatientQuery(patientId, { skip: !patientId });

  const h = form?.healthInfo;
  const profile = me?.healthProfile ?? form?.healthProfileSnapshot ?? null;

  const [step, setStep] = useState<Step>('visit');
  const [isSaving, setIsSaving] = useState(false);

  // ── Step 1: Visit reason ───────────────────────────────────────────────────
  const [chiefComplaint, setChiefComplaint] = useState(() => h?.chiefComplaint ?? '');
  const [symptomDuration, setSymptomDuration] = useState(() => h?.symptomDuration ?? '');
  const [symptomSeverity, setSymptomSeverity] = useState(() => h?.symptomSeverity ?? 0);
  const [currentSymptoms, setCurrentSymptoms] = useState<string[]>(() => h?.currentSymptoms ?? []);
  const [additionalSymptomDetail, setAdditionalSymptomDetail] = useState(() => h?.additionalSymptomDetail ?? '');

  // ── Step 2: Medical history ────────────────────────────────────────────────
  const [currentMedications, setCurrentMedications] = useState(() => h?.currentMedications ?? '');
  const [noKnownMedications, setNoKnownMedications] = useState(() => h?.noKnownMedications ?? false);
  const [medicationAllergies, setMedicationAllergies] = useState(() => h?.medicationAllergies ?? '');
  const [noKnownAllergies, setNoKnownAllergies] = useState(() => h?.noKnownAllergies ?? false);
  const [otherAllergies, setOtherAllergies] = useState(() => h?.otherAllergies ?? '');
  const [chronicConditions, setChronicConditions] = useState<string[]>(() => h?.chronicConditions ?? []);
  const [otherConditions, setOtherConditions] = useState(() => h?.otherConditions ?? '');
  const [previousSurgeries, setPreviousSurgeries] = useState(() => h?.previousSurgeries ?? '');
  const [recentHospitalization, setRecentHospitalization] = useState(() => h?.recentHospitalization ?? false);
  const [recentHospitalizationDetails, setRecentHospitalizationDetails] = useState(() => h?.recentHospitalizationDetails ?? '');
  const [familyHistory, setFamilyHistory] = useState<string[]>(() => h?.familyHistoryConditions ?? []);

  // ── Step 3: Lifestyle ──────────────────────────────────────────────────────
  const [smokingStatus, setSmokingStatus] = useState<'never' | 'former' | 'current' | ''>(() => (h?.smokingStatus as any) ?? '');
  const [smokingPacksPerDay, setSmokingPacksPerDay] = useState(() => String(h?.smokingPacksPerDay ?? ''));
  const [alcoholUse, setAlcoholUse] = useState<'none' | 'light' | 'moderate' | 'heavy' | ''>(() => (h?.alcoholUse as any) ?? '');
  const [recreationalDrugUse, setRecreationalDrugUse] = useState(() => h?.recreationalDrugUse ?? false);
  const [recreationalDrugDetails, setRecreationalDrugDetails] = useState(() => h?.recreationalDrugDetails ?? '');
  const [isPossiblyPregnant, setIsPossiblyPregnant] = useState(() => h?.isPossiblyPregnant ?? false);
  const [isCurrentlyPregnant, setIsCurrentlyPregnant] = useState(() => h?.isCurrentlyPregnant ?? false);
  const [onBirthControl, setOnBirthControl] = useState(() => h?.onBirthControl ?? false);
  const [birthControlType, setBirthControlType] = useState(() => h?.birthControlType ?? '');

  // ── Step 4: Mental health & safety ────────────────────────────────────────
  const [phq2LittleInterest, setPhq2LittleInterest] = useState<FrequencyScore | undefined>(() => h?.phq2LittleInterest);
  const [phq2FeelingDown, setPhq2FeelingDown] = useState<FrequencyScore | undefined>(() => h?.phq2FeelingDown);
  const [gad2FeelingAnxious, setGad2FeelingAnxious] = useState<FrequencyScore | undefined>(() => h?.gad2FeelingAnxious);
  const [gad2UncontrollableWorry, setGad2UncontrollableWorry] = useState<FrequencyScore | undefined>(() => h?.gad2UncontrollableWorry);
  const [historyOfMentalHealthDiagnosis, setHistoryOfMentalHealthDiagnosis] = useState(() => h?.historyOfMentalHealthDiagnosis ?? false);
  const [mentalHealthDiagnosisDetails, setMentalHealthDiagnosisDetails] = useState(() => h?.mentalHealthDiagnosisDetails ?? '');
  const [feelingSafe, setFeelingSafe] = useState<boolean | undefined>(() => h?.feelingSafe);
  const [historyOfAbuse, setHistoryOfAbuse] = useState(() => h?.historyOfAbuse ?? false);
  const [additionalConcerns, setAdditionalConcerns] = useState(() => h?.additionalConcerns ?? '');

  // ── Step 5: Consent ────────────────────────────────────────────────────────
  const [agreed, setAgreed] = useState(() => form?.consent?.hasReadAndAgreed ?? false);

  useEffect(() => {
    if (!form) return;

    setChiefComplaint(h?.chiefComplaint ?? '');
    setSymptomDuration(h?.symptomDuration ?? '');
    setSymptomSeverity(h?.symptomSeverity ?? 0);
    setCurrentSymptoms(h?.currentSymptoms ?? []);
    setAdditionalSymptomDetail(h?.additionalSymptomDetail ?? '');

    setCurrentMedications(
      h?.currentMedications ??
      profile?.currentMedications?.map((item) => [item.name, item.dose, item.frequency].filter(Boolean).join(' ')).join('\n') ??
      '',
    );
    setNoKnownMedications(h?.noKnownMedications ?? profile?.noKnownMedications ?? false);
    setMedicationAllergies(
      h?.medicationAllergies ??
      profile?.medicationAllergies?.map((item) => [item.substance, item.reaction].filter(Boolean).join(' — ')).join('\n') ??
      '',
    );
    setNoKnownAllergies(h?.noKnownAllergies ?? profile?.noKnownAllergies ?? false);
    setOtherAllergies(h?.otherAllergies ?? profile?.otherAllergies ?? '');
    setChronicConditions(h?.chronicConditions ?? profile?.chronicConditions ?? []);
    setOtherConditions(h?.otherConditions ?? profile?.otherConditions ?? '');
    setPreviousSurgeries(h?.previousSurgeries ?? profile?.previousSurgeries ?? '');
    setRecentHospitalization(h?.recentHospitalization ?? false);
    setRecentHospitalizationDetails(h?.recentHospitalizationDetails ?? '');
    setFamilyHistory(h?.familyHistoryConditions ?? profile?.familyHistoryConditions ?? []);

    setSmokingStatus((h?.smokingStatus ?? profile?.smokingStatus ?? '') as any);
    setSmokingPacksPerDay(String(h?.smokingPacksPerDay ?? profile?.smokingPacksPerDay ?? ''));
    setAlcoholUse((h?.alcoholUse ?? profile?.alcoholUse ?? '') as any);
    setRecreationalDrugUse(h?.recreationalDrugUse ?? profile?.recreationalDrugUse ?? false);
    setRecreationalDrugDetails(h?.recreationalDrugDetails ?? profile?.recreationalDrugDetails ?? '');
    setIsPossiblyPregnant(h?.isPossiblyPregnant ?? false);
    setIsCurrentlyPregnant(h?.isCurrentlyPregnant ?? false);
    setOnBirthControl(h?.onBirthControl ?? profile?.onBirthControl ?? false);
    setBirthControlType(h?.birthControlType ?? profile?.birthControlType ?? '');

    setPhq2LittleInterest(h?.phq2LittleInterest);
    setPhq2FeelingDown(h?.phq2FeelingDown);
    setGad2FeelingAnxious(h?.gad2FeelingAnxious);
    setGad2UncontrollableWorry(h?.gad2UncontrollableWorry);
    setHistoryOfMentalHealthDiagnosis(
      h?.historyOfMentalHealthDiagnosis ?? profile?.historyOfMentalHealthDiagnosis ?? false,
    );
    setMentalHealthDiagnosisDetails(
      h?.mentalHealthDiagnosisDetails ?? profile?.mentalHealthDiagnosisDetails ?? '',
    );
    setFeelingSafe(h?.feelingSafe);
    setHistoryOfAbuse(h?.historyOfAbuse ?? false);
    setAdditionalConcerns(h?.additionalConcerns ?? '');
    setAgreed(form?.consent?.hasReadAndAgreed ?? false);
  }, [form, h, profile]);

  const toggleItem = useCallback(
    (list: string[], setList: (v: string[]) => void, val: string) =>
      setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]),
    [],
  );

  const buildHealthInfo = (): Partial<HealthIntakeInfo> => ({
    chiefComplaint,
    symptomDuration,
    symptomSeverity,
    currentSymptoms,
    additionalSymptomDetail,
    currentMedications: noKnownMedications ? undefined : currentMedications,
    noKnownMedications,
    medicationAllergies: noKnownAllergies ? undefined : medicationAllergies,
    noKnownAllergies,
    otherAllergies,
    chronicConditions,
    otherConditions,
    previousSurgeries,
    recentHospitalization,
    recentHospitalizationDetails: recentHospitalization ? recentHospitalizationDetails : undefined,
    familyHistoryConditions: familyHistory,
    smokingStatus: smokingStatus || undefined,
    smokingPacksPerDay: smokingStatus === 'current' && smokingPacksPerDay ? parseFloat(smokingPacksPerDay) : undefined,
    alcoholUse: alcoholUse || undefined,
    recreationalDrugUse,
    recreationalDrugDetails: recreationalDrugUse ? recreationalDrugDetails : undefined,
    isPossiblyPregnant,
    isCurrentlyPregnant,
    onBirthControl,
    birthControlType: onBirthControl ? birthControlType : undefined,
    phq2LittleInterest,
    phq2FeelingDown,
    gad2FeelingAnxious,
    gad2UncontrollableWorry,
    historyOfMentalHealthDiagnosis,
    mentalHealthDiagnosisDetails: historyOfMentalHealthDiagnosis ? mentalHealthDiagnosisDetails : undefined,
    feelingSafe,
    historyOfAbuse,
    additionalConcerns,
  });

  const buildConsent = (): ConsentInfo => ({
    hasReadAndAgreed: agreed,
    signatureDate: new Date().toISOString(),
  });

  const buildHealthProfilePatch = (): Partial<HealthProfile> => ({
    currentMedications: noKnownMedications
      ? []
      : currentMedications
          .split(/\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
          .map((name) => ({ name })),
    noKnownMedications,
    medicationAllergies: noKnownAllergies
      ? []
      : medicationAllergies
          .split(/\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
          .map((substance) => ({ substance })),
    noKnownAllergies,
    otherAllergies,
    chronicConditions,
    otherConditions,
    previousSurgeries,
    familyHistoryConditions: familyHistory,
    smokingStatus: smokingStatus || undefined,
    smokingPacksPerDay: smokingStatus === 'current' && smokingPacksPerDay ? parseFloat(smokingPacksPerDay) : undefined,
    alcoholUse: alcoholUse || undefined,
    recreationalDrugUse,
    recreationalDrugDetails: recreationalDrugUse ? recreationalDrugDetails : undefined,
    onBirthControl,
    birthControlType: onBirthControl ? birthControlType : undefined,
    historyOfMentalHealthDiagnosis,
    mentalHealthDiagnosisDetails: historyOfMentalHealthDiagnosis ? mentalHealthDiagnosisDetails : undefined,
  });

  const autoSave = async () => {
    if (!id) return;
    setIsSaving(true);
    await updateForm({ id, healthInfo: buildHealthInfo() });
    setIsSaving(false);
  };

  const handleNext = async () => {
    if (step === 'visit' && !chiefComplaint.trim()) {
      Alert.alert('Required', 'Please describe your reason for visit.');
      return;
    }
    const idx = STEPS.indexOf(step);
    // auto-save on every forward step
    await autoSave();
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const handleBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
    else router.back();
  };

  const handleSubmit = async () => {
    if (!id) return;
    if (!agreed) {
      Alert.alert('Consent required', 'Please read and agree to the telehealth consent to submit.');
      return;
    }
    const result = await submitForm({
      id,
      healthInfo: buildHealthInfo(),
      healthProfilePatch: buildHealthProfilePatch(),
      confirmHealthProfileReview: true,
      consent: buildConsent(),
    });
    if ('data' in result) {
      Alert.alert('Submitted', 'Your health intake form has been submitted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', 'Could not submit. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (form?.status === 'completed') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name='arrow-back' size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Intake</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name='checkmark-circle' size={64} color={colors.success} />
          <Text style={styles.completedTitle}>Already Submitted</Text>
          <Text style={styles.completedSub}>Your health intake form has been completed.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stepIdx = STEPS.indexOf(step);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name='arrow-back' size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Intake</Text>
        {step !== 'consent' ? (
          <TouchableOpacity onPress={autoSave} disabled={isSaving} style={styles.saveBtn}>
            {isSaving ? <ActivityIndicator size='small' color={colors.primary} /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.progressSeg, { backgroundColor: i <= stepIdx ? colors.primary : colors.gray200 }]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>{`Step ${stepIdx + 1} of ${STEPS.length} — ${STEP_LABELS[step]}`}</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>

          {/* ── Step 1: Visit Reason ──────────────────────────────────── */}
          {step === 'visit' && (
            <>
              <SectionLabel text='What brings you in today? *' />
              <StyledInput
                value={chiefComplaint}
                onChangeText={setChiefComplaint}
                placeholder='Describe your main concern…'
                multiline
              />

              <SectionLabel text='How long have you had this?' />
              <StyledInput
                value={symptomDuration}
                onChangeText={setSymptomDuration}
                placeholder='e.g. 2 days, 3 weeks…'
              />

              <SectionLabel text='Pain / discomfort severity (0 = none, 10 = worst)' />
              <SeveritySlider value={symptomSeverity} onChange={setSymptomSeverity} />

              <SectionLabel text='Current symptoms (select all that apply)' />
              <View style={styles.chipRow}>
                {COMMON_SYMPTOMS.map((s) => (
                  <ConditionChip
                    key={s} label={s}
                    selected={currentSymptoms.includes(s)}
                    onPress={() => toggleItem(currentSymptoms, setCurrentSymptoms, s)}
                  />
                ))}
              </View>

              <SectionLabel text='Anything else to describe your symptoms?' />
              <StyledInput
                value={additionalSymptomDetail}
                onChangeText={setAdditionalSymptomDetail}
                placeholder='Additional detail…'
                multiline
              />
            </>
          )}

          {/* ── Step 2: Medical History ───────────────────────────────── */}
          {step === 'history' && (
            <>
              {profile && (
                <View style={styles.prefillBox}>
                  <Text style={styles.prefillText}>
                    We filled these answers from your saved health profile. Review and update anything that has changed.
                  </Text>
                </View>
              )}
              <SectionLabel text='Current medications' />
              <ToggleRow
                label='No known medications'
                value={noKnownMedications}
                onToggle={setNoKnownMedications}
              />
              {!noKnownMedications && (
                <StyledInput
                  value={currentMedications}
                  onChangeText={setCurrentMedications}
                  placeholder='Name, dose, and how often (e.g. Metformin 500mg twice daily)'
                  multiline
                />
              )}

              <SectionLabel text='Drug allergies' />
              <ToggleRow
                label='No known drug allergies (NKDA)'
                value={noKnownAllergies}
                onToggle={setNoKnownAllergies}
              />
              {!noKnownAllergies && (
                <StyledInput
                  value={medicationAllergies}
                  onChangeText={setMedicationAllergies}
                  placeholder='Drug name and reaction (e.g. Penicillin — hives)'
                  multiline
                />
              )}

              <SectionLabel text='Other allergies (food, environmental)' />
              <StyledInput
                value={otherAllergies}
                onChangeText={setOtherAllergies}
                placeholder='e.g. Peanuts, latex, pollen…'
              />

              <SectionLabel text='Chronic conditions (select all that apply)' />
              <View style={styles.chipRow}>
                {CHRONIC_CONDITIONS.map((c) => (
                  <ConditionChip
                    key={c} label={c}
                    selected={chronicConditions.includes(c)}
                    onPress={() => toggleItem(chronicConditions, setChronicConditions, c)}
                  />
                ))}
              </View>

              <SectionLabel text='Other conditions not listed' />
              <StyledInput value={otherConditions} onChangeText={setOtherConditions} placeholder='Other diagnoses…' />

              <SectionLabel text='Previous surgeries or procedures' />
              <StyledInput value={previousSurgeries} onChangeText={setPreviousSurgeries} placeholder='e.g. Appendectomy 2018…' multiline />

              <ToggleRow
                label='Hospitalized in the past year'
                value={recentHospitalization}
                onToggle={setRecentHospitalization}
              />
              {recentHospitalization && (
                <StyledInput
                  value={recentHospitalizationDetails}
                  onChangeText={setRecentHospitalizationDetails}
                  placeholder='Reason and duration…'
                  multiline
                />
              )}

              <SectionLabel text='Family history (immediate relatives)' />
              <View style={styles.chipRow}>
                {FAMILY_CONDITIONS.map((c) => (
                  <ConditionChip
                    key={c} label={c}
                    selected={familyHistory.includes(c)}
                    onPress={() => toggleItem(familyHistory, setFamilyHistory, c)}
                  />
                ))}
              </View>
            </>
          )}

          {/* ── Step 3: Lifestyle ─────────────────────────────────────── */}
          {step === 'lifestyle' && (
            <>
              {profile && (
                <View style={styles.prefillBox}>
                  <Text style={styles.prefillText}>
                    Lifestyle and history answers are prefilled from your profile when available.
                  </Text>
                </View>
              )}
              <OptionGroup
                label='Smoking / tobacco use'
                options={[
                  { label: 'Never', value: 'never' },
                  { label: 'Former', value: 'former' },
                  { label: 'Current', value: 'current' },
                ]}
                value={smokingStatus}
                onSelect={setSmokingStatus}
              />
              {smokingStatus === 'current' && (
                <StyledInput
                  value={smokingPacksPerDay}
                  onChangeText={setSmokingPacksPerDay}
                  placeholder='Packs per day'
                  keyboardType='decimal-pad'
                />
              )}

              <OptionGroup
                label='Alcohol use'
                options={[
                  { label: 'None', value: 'none' },
                  { label: 'Light\n(≤7/wk)', value: 'light' },
                  { label: 'Moderate\n(8–14/wk)', value: 'moderate' },
                  { label: 'Heavy\n(15+/wk)', value: 'heavy' },
                ]}
                value={alcoholUse}
                onSelect={setAlcoholUse}
              />

              <ToggleRow
                label='Recreational drug use'
                value={recreationalDrugUse}
                onToggle={setRecreationalDrugUse}
                sublabel='This information is confidential and helps your provider give safe care.'
              />
              {recreationalDrugUse && (
                <StyledInput
                  value={recreationalDrugDetails}
                  onChangeText={setRecreationalDrugDetails}
                  placeholder='Which substances and how often…'
                  multiline
                />
              )}

              <SectionLabel text="Women's health" />
              <ToggleRow label='Could you be pregnant?' value={isPossiblyPregnant} onToggle={setIsPossiblyPregnant} />
              {isPossiblyPregnant && (
                <ToggleRow label='Confirmed pregnancy' value={isCurrentlyPregnant} onToggle={setIsCurrentlyPregnant} />
              )}
              <ToggleRow label='Currently using birth control' value={onBirthControl} onToggle={setOnBirthControl} />
              {onBirthControl && (
                <StyledInput value={birthControlType} onChangeText={setBirthControlType} placeholder='Type (pill, IUD, patch…)' />
              )}
            </>
          )}

          {/* ── Step 4: Mental Health & Safety ───────────────────────── */}
          {step === 'mental' && (
            <>
              <View style={styles.screeningNote}>
                <Text style={styles.screeningNoteText}>
                  Over the past 2 weeks, how often have you been bothered by the following?
                </Text>
              </View>

              <FreqPicker
                label='Little interest or pleasure in doing things'
                value={phq2LittleInterest}
                onChange={setPhq2LittleInterest}
              />
              <FreqPicker
                label='Feeling down, depressed, or hopeless'
                value={phq2FeelingDown}
                onChange={setPhq2FeelingDown}
              />
              <FreqPicker
                label='Feeling nervous, anxious, or on edge'
                value={gad2FeelingAnxious}
                onChange={setGad2FeelingAnxious}
              />
              <FreqPicker
                label='Not being able to stop or control worrying'
                value={gad2UncontrollableWorry}
                onChange={setGad2UncontrollableWorry}
              />

              <ToggleRow
                label='History of mental health diagnosis'
                value={historyOfMentalHealthDiagnosis}
                onToggle={setHistoryOfMentalHealthDiagnosis}
              />
              {historyOfMentalHealthDiagnosis && (
                <StyledInput
                  value={mentalHealthDiagnosisDetails}
                  onChangeText={setMentalHealthDiagnosisDetails}
                  placeholder='e.g. Depression, anxiety, PTSD…'
                  multiline
                />
              )}

              <View style={[styles.screeningNote, { marginTop: spacing.md, backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.screeningNoteText, { color: colors.primary }]}>
                  The following questions help your provider give you safe, trauma-informed care. Your answers are confidential.
                </Text>
              </View>

              <SectionLabel text='Do you feel safe in your home environment?' />
              <View style={styles.optionRow}>
                {[{ label: 'Yes', v: true }, { label: 'No', v: false }].map(({ label, v }) => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.optionBtn, feelingSafe === v && styles.optionBtnSelected]}
                    onPress={() => setFeelingSafe(v)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionBtnText, feelingSafe === v && styles.optionBtnTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ToggleRow
                label='History of physical, emotional, or sexual abuse'
                value={historyOfAbuse}
                onToggle={setHistoryOfAbuse}
                sublabel='Disclosing this helps your provider understand your health history.'
              />

              <SectionLabel text='Anything else you want your provider to know?' />
              <StyledInput
                value={additionalConcerns}
                onChangeText={setAdditionalConcerns}
                placeholder='Additional concerns or information…'
                multiline
              />
            </>
          )}

          {/* ── Step 5: Consent ───────────────────────────────────────── */}
          {step === 'consent' && (
            <>
              <View style={styles.consentBox}>
                <Text style={styles.consentTitle}>Telehealth Informed Consent</Text>
                <Text style={styles.consentText}>
                  By agreeing below, I consent to receive medical care via telehealth technology. I understand that:{'\n\n'}
                  • Telehealth involves electronic communication of my medical information to healthcare providers.{'\n\n'}
                  • I have the right to withhold or withdraw consent at any time.{'\n\n'}
                  • My information may be shared with other treating providers as necessary for my care.{'\n\n'}
                  • There are potential risks with telehealth, including technical difficulties that may interrupt care.{'\n\n'}
                  • I confirm that all information in this intake form is accurate and complete to the best of my knowledge.{'\n\n'}
                  • I understand that this information will be reviewed by a licensed healthcare provider.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.consentToggle}
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Ionicons name='checkmark' size={14} color={colors.white} />}
                </View>
                <Text style={styles.consentToggleText}>
                  I have read and agree to the telehealth informed consent above
                </Text>
              </TouchableOpacity>

              {/* Summary */}
              <View style={styles.reviewBox}>
                <Text style={styles.reviewTitle}>Summary</Text>
                <Text style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Chief complaint: </Text>
                  {chiefComplaint || '—'}
                </Text>
                <Text style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Severity: </Text>
                  {symptomSeverity}/10
                </Text>
                <Text style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Medications: </Text>
                  {noKnownMedications ? 'None' : currentMedications || '—'}
                </Text>
                <Text style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Allergies: </Text>
                  {noKnownAllergies ? 'NKDA' : medicationAllergies || '—'}
                </Text>
                <Text style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Conditions: </Text>
                  {chronicConditions.length > 0 ? chronicConditions.join(', ') : 'None reported'}
                </Text>
                <Text style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Consent: </Text>
                  <Text style={{ color: agreed ? colors.success : colors.danger }}>
                    {agreed ? 'Agreed' : 'Not yet — check the box above'}
                  </Text>
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        {step === 'consent' ? (
          <TouchableOpacity
            style={[styles.primaryBtn, !agreed && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || !agreed}
          >
            {isSubmitting
              ? <ActivityIndicator size='small' color={colors.white} />
              : <Text style={styles.primaryBtnText}>Submit Intake Form</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} disabled={isSaving}>
            {isSaving
              ? <ActivityIndicator size='small' color={colors.white} />
              : <Text style={styles.primaryBtnText}>Next</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs, width: 36 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  saveBtn: { padding: spacing.xs },
  saveBtnText: { color: colors.primary, fontWeight: '500', fontSize: 14 },

  progressBar: { flexDirection: 'row', height: 4, gap: 2, paddingHorizontal: spacing.md, paddingTop: 6 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { fontSize: 12, color: colors.textSecondary, paddingHorizontal: spacing.md, paddingTop: 4, paddingBottom: spacing.sm },

  content: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.md,
    marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  fieldLabel: { fontSize: 14, color: colors.textPrimary, marginBottom: spacing.xs },

  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    fontSize: 15, color: colors.textPrimary, backgroundColor: colors.white,
  },
  inputMulti: { height: 100, textAlignVertical: 'top' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  toggleLabel: { fontSize: 15, color: colors.textPrimary },
  toggleSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary, fontWeight: '500' },

  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  optionBtn: {
    flex: 1, minWidth: 72, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', backgroundColor: colors.white,
  },
  optionBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionBtnText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, textAlign: 'center' },
  optionBtnTextSelected: { color: colors.primary },

  severityRow: { flexDirection: 'row', gap: 3, marginBottom: 4 },
  severityBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 6,
    borderWidth: 1.5, alignItems: 'center',
  },
  severityBtnText: { fontSize: 12, fontWeight: '600' },
  severityLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  severityLabelText: { fontSize: 11, color: colors.textSecondary },

  screeningNote: {
    backgroundColor: colors.gray50, borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  screeningNoteText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  prefillBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.sm,
  },
  prefillText: { fontSize: 13, color: colors.primary, lineHeight: 20 },

  freqBlock: { marginBottom: spacing.md },
  freqQuestion: { fontSize: 14, color: colors.textPrimary, marginBottom: spacing.xs, lineHeight: 20 },
  freqOptions: { flexDirection: 'row', gap: 4 },
  freqBtn: {
    flex: 1, paddingVertical: 8, borderRadius: radius.sm,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', backgroundColor: colors.white,
  },
  freqBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  freqBtnText: { fontSize: 11, fontWeight: '500', color: colors.textSecondary, textAlign: 'center' },
  freqBtnTextSelected: { color: colors.white },

  consentBox: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  consentTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  consentText: { fontSize: 13, color: colors.textSecondary, lineHeight: 22 },
  consentToggle: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentToggleText: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },

  reviewBox: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  reviewTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  reviewRow: { fontSize: 13, color: colors.textPrimary, lineHeight: 22 },
  reviewKey: { fontWeight: '600' },

  footer: {
    padding: spacing.md, backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: colors.gray300 },
  primaryBtnText: { color: colors.white, fontWeight: '600', fontSize: 16 },

  completedTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md },
  completedSub: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  doneBtn: {
    marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
  },
  doneBtnText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
