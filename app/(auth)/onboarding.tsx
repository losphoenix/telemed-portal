import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreenContainer, Input, Button } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useUpdateProfileMutation } from '@/services/patientApi';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  address: z.string().min(5, 'Enter a valid address'),
  phoneNumber: z
    .string()
    .regex(/^\+?[\d\s\-().]{7,}$/, 'Enter a valid phone number'),
  dobMonth: z
    .string()
    .regex(/^(0?[1-9]|1[0-2])$/, 'MM'),
  dobDay: z
    .string()
    .regex(/^(0?[1-9]|[12]\d|3[01])$/, 'DD'),
  dobYear: z
    .string()
    .regex(/^\d{4}$/, 'YYYY'),
  gender: z.enum(['male', 'female'], { required_error: 'Select a sex' }),
});

type FormValues = z.infer<typeof schema>;

const GENDER_OPTIONS: { label: string; value: 'male' | 'female' }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { patientId, email } = useLocalSearchParams<{ patientId: string; email: string }>();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      address: '',
      phoneNumber: '',
      dobMonth: '',
      dobDay: '',
      dobYear: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // Build ISO date string (YYYY-MM-DD)
      const mm = values.dobMonth.padStart(2, '0');
      const dd = values.dobDay.padStart(2, '0');
      const dateOfBirth = `${values.dobYear}-${mm}-${dd}`;

      await updateProfile({
        id: patientId,
        firstName: values.firstName,
        lastName: values.lastName,
        name: `${values.firstName} ${values.lastName}`,
        phoneNumber: values.phoneNumber,
        dateOfBirth,
        gender: values.gender,
        address: values.address,
      }).unwrap();

      router.push({
        pathname: '/(auth)/policy',
        params: { patientId },
      });
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message ?? 'Could not save your details. Please try again.');
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={typography.h2}>Share a few more details</Text>
            <Text style={[typography.body, styles.subtitle]}>
              These details help us provide you with the best care. They will be
              securely saved to your profile.
            </Text>
          </View>

          <View style={styles.form}>
            {/* Legal first name */}
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Legal first name"
                  placeholder="First name"
                  autoComplete="given-name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.firstName?.message}
                />
              )}
            />

            {/* Legal last name */}
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Legal last name"
                  placeholder="Last name"
                  autoComplete="family-name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.lastName?.message}
                />
              )}
            />

            {/* Email (display only) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.readonlyField}>
                <Text style={styles.readonlyText}>{email}</Text>
              </View>
            </View>

            {/* Address */}
            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Address"
                  placeholder="123 Main St, City, State ZIP"
                  autoComplete="street-address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.address?.message}
                />
              )}
            />

            {/* Phone */}
            <Controller
              control={control}
              name="phoneNumber"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Phone number"
                  placeholder="+1 (555) 000-0000"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phoneNumber?.message}
                />
              )}
            />

            {/* Date of birth */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Date of birth</Text>
              <View style={styles.dobRow}>
                <Controller
                  control={control}
                  name="dobMonth"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input
                      placeholder="MM"
                      keyboardType="number-pad"
                      maxLength={2}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.dobMonth ? ' ' : undefined}
                      containerStyle={styles.dobField}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="dobDay"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input
                      placeholder="DD"
                      keyboardType="number-pad"
                      maxLength={2}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.dobDay ? ' ' : undefined}
                      containerStyle={styles.dobField}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="dobYear"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input
                      placeholder="YYYY"
                      keyboardType="number-pad"
                      maxLength={4}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.dobYear ? ' ' : undefined}
                      containerStyle={styles.dobFieldWide}
                    />
                  )}
                />
              </View>
              {(errors.dobMonth || errors.dobDay || errors.dobYear) && (
                <Text style={styles.errorText}>Enter a valid date of birth</Text>
              )}
            </View>

            {/* Legal sex */}
            <Controller
              control={control}
              name="gender"
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Legal sex</Text>
                  <View style={styles.genderRow}>
                    {GENDER_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.genderOption,
                          value === opt.value && styles.genderOptionSelected,
                        ]}
                        onPress={() => onChange(opt.value)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.genderLabel,
                            value === opt.value && styles.genderLabelSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.gender && (
                    <Text style={styles.errorText}>{errors.gender.message}</Text>
                  )}
                </View>
              )}
            />

            <Button
              label="Continue"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              style={styles.cta}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing['4xl'],
  },
  header: {
    marginTop: spacing['2xl'],
    marginBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.base,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  readonlyField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.gray50,
    minHeight: 44,
    justifyContent: 'center',
  },
  readonlyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  dobRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dobField: {
    flex: 1,
  },
  dobFieldWide: {
    flex: 1.6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderOption: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  genderOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  genderLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  genderLabelSelected: {
    color: colors.primary,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 2,
  },
  cta: {
    marginTop: spacing.sm,
  },
});
