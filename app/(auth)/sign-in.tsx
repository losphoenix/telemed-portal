import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreenContainer, Input, Button } from '@/components';
import { colors, spacing, typography } from '@/theme';
import { useGeneratePatientCodeMutation } from '@/services/authApi';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isSignup = mode === 'signup';
  const [generateCode, { isLoading }] = useGeneratePatientCodeMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await generateCode({ email: values.email }).unwrap();
      router.push({
        pathname: '/(auth)/verify',
        params: { email: values.email, mode: mode ?? 'login' },
      });
    } catch (err: any) {
      const message = err?.data?.message ?? 'Something went wrong. Please try again.';
      Alert.alert('Error', message);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <View style={styles.logoMark} />
          <Text style={typography.h2}>{isSignup ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={[typography.body, styles.subtitle]}>
            {isSignup
              ? 'Enter your email to get started. We\'ll send you a verification code.'
              : 'Enter your email to receive a verification code.'}
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Email address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Button
            label="Send verification code"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.cta}
          />

        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    marginTop: spacing['3xl'],
    marginBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.base,
  },
  cta: {
    marginTop: spacing.sm,
  },
});
