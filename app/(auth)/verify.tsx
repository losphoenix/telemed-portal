import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
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
import {
  useGeneratePatientCodeMutation,
  useLoginPatientMutation,
} from '@/services/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/authSlice';

const schema = z.object({
  emailCode: z.string().length(6, 'Enter the 6-digit code'),
});

type FormValues = z.infer<typeof schema>;

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loginPatient, { isLoading }] = useLoginPatientMutation();
  const [generateCode] = useGeneratePatientCodeMutation();
  const [resent, setResent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const { access_token } = await loginPatient({
        email,
        emailCode: values.emailCode,
      }).unwrap();

      // Decode the JWT payload (no library needed — base64 the middle segment)
      const payload = JSON.parse(atob(access_token.split('.')[1]));

      dispatch(
        setCredentials({
          token: access_token,
          patient: {
            _id: payload.id,
            name: payload.name,
            email: payload.email,
          },
        }),
      );

      router.replace('/(patient)/home');
    } catch (err: any) {
      const message = err?.data?.message ?? 'Invalid code. Please try again.';
      Alert.alert('Error', message);
    }
  };

  const handleResend = async () => {
    try {
      await generateCode({ email }).unwrap();
      setResent(true);
      setTimeout(() => setResent(false), 30000);
    } catch {
      Alert.alert('Error', 'Could not resend code. Please try again.');
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Text style={typography.h2}>Check your email</Text>
          <Text style={[typography.body, styles.subtitle]}>
            We sent a 6-digit code to{' '}
            <Text style={{ fontWeight: '600', color: colors.textPrimary }}>
              {email}
            </Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="emailCode"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Verification code"
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                value={value}
                onChangeText={onChange}
                error={errors.emailCode?.message}
              />
            )}
          />

          <Button
            label="Verify & continue"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.cta}
          />

          <View style={styles.resendRow}>
            <Text style={typography.bodySmall}>Didn't get the code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={resent}>
              <Text
                style={[
                  typography.bodySmall,
                  { color: resent ? colors.textDisabled : colors.primary, fontWeight: '600' },
                ]}
              >
                {resent ? 'Sent!' : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  cta: {
    marginTop: spacing.sm,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
