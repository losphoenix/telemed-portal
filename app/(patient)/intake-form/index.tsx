import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import {
  useGetMyIntakeFormsQuery,
  useCreateIntakeFormMutation,
  IntakeForm,
} from '@/services/intakeFormApi';
import { useGetPatientQuery } from '@/services/patientApi';

function StatusBadge({ status, expiresAt }: { status: string; expiresAt?: string }) {
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const label = status === 'completed' ? (isExpired ? 'Expired' : 'Completed') : 'Draft';
  const color =
    status === 'completed'
      ? isExpired
        ? colors.warning
        : colors.success
      : colors.warning;

  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function FormCard({ form, onPress }: { form: IntakeForm; onPress: () => void }) {
  const date = new Date(form.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardLeft}>
        <View style={styles.cardIcon}>
          <Ionicons name='document-text' size={22} color={colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Massage Intake Form</Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <StatusBadge status={form.status} expiresAt={form.expiresAt} />
        <Ionicons name='chevron-forward' size={16} color={colors.gray300} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function IntakeFormListScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);

  const { data: forms, isLoading } = useGetMyIntakeFormsQuery(undefined, {
    skip: !patient?._id,
  });
  const { data: me } = useGetPatientQuery(patient?._id ?? '', { skip: !patient?._id });
  const [createForm, { isLoading: isCreating }] = useCreateIntakeFormMutation();

  const handleNew = async () => {
    if (!patient?._id) return;
    const result = await createForm({ patientId: patient._id });
    if ('data' in result && result.data?._id) {
      router.push(`/intake-form/${result.data._id}`);
    }
  };

  const handleOpen = (id: string) => {
    router.push(`/intake-form/${id}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name='arrow-back' size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Intake Forms</Text>
        <TouchableOpacity
          onPress={handleNew}
          style={styles.newBtn}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size='small' color={colors.primary} />
          ) : (
            <Ionicons name='add' size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      ) : !forms || forms.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name='document-text-outline' size={56} color={colors.gray300} />
          <Text style={styles.emptyTitle}>No intake forms yet</Text>
          <Text style={styles.emptySubtitle}>
            Complete a health intake form before your appointment.
          </Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={handleNew}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size='small' color={colors.white} />
            ) : (
              <Text style={styles.startBtnText}>Start Intake Form</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={forms}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Health Profile</Text>
              <Text style={styles.summaryText}>
                Conditions: {me?.healthProfile?.chronicConditions?.length ? me.healthProfile.chronicConditions.join(', ') : 'None on file'}
              </Text>
              <Text style={styles.summaryText}>
                Medications: {me?.healthProfile?.noKnownMedications ? 'None known' : (me?.healthProfile?.currentMedications?.length ?? 0)}
              </Text>
              <Text style={styles.summaryText}>
                Allergies: {me?.healthProfile?.noKnownAllergies ? 'None known' : me?.healthProfile?.otherAllergies || `${me?.healthProfile?.medicationAllergies?.length ?? 0} listed`}
              </Text>
              <Text style={styles.summaryMeta}>
                {me?.healthProfile?.lastReviewedAt
                  ? `Last reviewed ${new Date(me.healthProfile.lastReviewedAt).toLocaleDateString('en-US')}`
                  : 'No saved health profile yet'}
              </Text>
              <TouchableOpacity style={styles.summaryBtn} onPress={handleNew} disabled={isCreating}>
                <Text style={styles.summaryBtnText}>Review & Update in Intake Form</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <FormCard form={item} onPress={() => handleOpen(item._id)} />
          )}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addMoreBtn}
              onPress={handleNew}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size='small' color={colors.primary} />
              ) : (
                <>
                  <Ionicons name='add-circle-outline' size={18} color={colors.primary} />
                  <Text style={styles.addMoreText}>New intake form</Text>
                </>
              )}
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  newBtn: {
    padding: spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  startBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  startBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  summaryMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  summaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  summaryBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  addMoreText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 14,
  },
});
