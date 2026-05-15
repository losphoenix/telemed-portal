import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Button } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useAcceptPolicyMutation } from '@/services/patientApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCredentials } from '@/store/authSlice';

const MUST_ACCEPT = [
  { key: 'privacy', label: 'Privacy Notice' },
  { key: 'medicalTerms', label: 'Medical Terms of Service' },
  { key: 'membershipTerms', label: 'Membership Terms of Service' },
] as const;

const ACKNOWLEDGE = [
  { key: 'hipaa', label: 'Notice of HIPAA Privacy Practices' },
] as const;

type AcceptKey = (typeof MUST_ACCEPT)[number]['key'] | (typeof ACKNOWLEDGE)[number]['key'];

export default function PolicyScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { token, patient } = useAppSelector((s) => s.auth);
  const [acceptPolicy, { isLoading }] = useAcceptPolicyMutation();

  const [accepted, setAccepted] = useState<Set<AcceptKey>>(new Set());

  const allRequired = [...MUST_ACCEPT, ...ACKNOWLEDGE].every((item) =>
    accepted.has(item.key),
  );

  const toggle = (key: AcceptKey) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleComplete = async () => {
    if (!allRequired) return;
    try {
      await acceptPolicy({ id: patientId }).unwrap();
      // Mark onboarding complete in local state so the route guard lets us through
      if (token && patient) {
        dispatch(
          setCredentials({
            token,
            patient: { ...patient, onboardingComplete: true },
          }),
        );
      }
      router.replace('/(patient)/home');
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message ?? 'Could not save your consent. Please try again.');
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={typography.h2}>Terms of Service, Privacy Policy, and HIPAA Notice</Text>
          <Text style={[typography.body, styles.subtitle]}>
            In order to complete your account, you must agree to the terms below.
          </Text>
        </View>

        {/* Must accept section */}
        <View style={styles.section}>
          <Text style={styles.sectionHint}>
            I am at least 18 years of age and I have read and accept:
          </Text>
          <View style={styles.card}>
            {MUST_ACCEPT.map((item, index) => (
              <React.Fragment key={item.key}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => toggle(item.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      accepted.has(item.key) && styles.checkboxChecked,
                    ]}
                  >
                    {accepted.has(item.key) && (
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    )}
                  </View>
                </TouchableOpacity>
                {index < MUST_ACCEPT.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Acknowledge section */}
        <View style={styles.section}>
          <Text style={styles.sectionHint}>I acknowledge receipt of the following:</Text>
          <View style={styles.card}>
            {ACKNOWLEDGE.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.row}
                onPress={() => toggle(item.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.rowLabel}>{item.label}</Text>
                <View
                  style={[
                    styles.checkbox,
                    accepted.has(item.key) && styles.checkboxChecked,
                  ]}
                >
                  {accepted.has(item.key) && (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Complete Account Setup"
          onPress={handleComplete}
          loading={isLoading}
          disabled={!allRequired}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  header: {
    marginTop: spacing['2xl'],
    marginBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionHint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.base,
  },
  footer: {
    paddingTop: spacing.base,
  },
});
