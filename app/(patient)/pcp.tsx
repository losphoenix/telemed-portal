import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components';
import { colors, spacing, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetPatientQuery, useUpdatePcpMutation, useClearPcpMutation } from '@/services/patientApi';
import { useGetDoctorsQuery } from '@/services/orgApi';

const TEAL = '#1a7a6e';
const TEAL_LIGHT = '#e8f4f2';

type Mode = 'view' | 'select-internal' | 'enter-external';

export default function PcpScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);
  const patientId = patient?._id ?? '';
  const orgId = patient?.orgs?.[0] ?? '';

  const { data: me, isLoading: meLoading, refetch } = useGetPatientQuery(patientId, { skip: !patientId });
  const { data: doctors = [], isLoading: doctorsLoading } = useGetDoctorsQuery(orgId, { skip: !orgId });

  const [updatePcp, { isLoading: saving }] = useUpdatePcpMutation();
  const [clearPcp, { isLoading: clearing }] = useClearPcpMutation();

  const [mode, setMode] = useState<Mode>('view');
  const [extName, setExtName] = useState('');
  const [extPhone, setExtPhone] = useState('');
  const [extPractice, setExtPractice] = useState('');

  const pcp = me?.pcp;
  const hasPcp = !!pcp;
  const internalDoctor = !pcp?.isExternal && pcp?.doctorId
    ? (typeof pcp.doctorId === 'object' ? pcp.doctorId : null)
    : null;

  const handleSelectInternal = async (doctorId: string, doctorName: string) => {
    try {
      await updatePcp({ id: patientId, isExternal: false, doctorId }).unwrap();
      await refetch();
      setMode('view');
    } catch {
      Alert.alert('Error', 'Could not save your PCP. Please try again.');
    }
  };

  const handleSaveExternal = async () => {
    if (!extName.trim()) {
      Alert.alert('Name required', 'Please enter your provider\'s name.');
      return;
    }
    try {
      await updatePcp({
        id: patientId,
        isExternal: true,
        name: extName.trim(),
        phone: extPhone.trim() || undefined,
        practice: extPractice.trim() || undefined,
      }).unwrap();
      await refetch();
      setMode('view');
    } catch {
      Alert.alert('Error', 'Could not save your PCP. Please try again.');
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Remove PCP',
      'Are you sure you want to remove your primary care provider?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearPcp({ id: patientId }).unwrap();
              await refetch();
            } catch {
              Alert.alert('Error', 'Could not remove your PCP. Please try again.');
            }
          },
        },
      ],
    );
  };

  const startExternal = () => {
    setExtName(pcp?.isExternal ? pcp.name ?? '' : '');
    setExtPhone(pcp?.isExternal ? pcp.phone ?? '' : '');
    setExtPractice(pcp?.isExternal ? pcp.practice ?? '' : '');
    setMode('enter-external');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => mode === 'view' ? router.back() : setMode('view')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Primary Care Provider</Text>
        <View style={{ width: 38 }} />
      </View>

      {meLoading ? (
        <View style={styles.centered}><ActivityIndicator color={TEAL} /></View>
      ) : mode === 'view' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {hasPcp ? (
            <>
              {/* PCP info card */}
              <View style={styles.pcpCard}>
                <View style={styles.pcpCardInner}>
                  <Avatar name={pcp.isExternal ? (pcp.name ?? 'PCP') : (internalDoctor?.name ?? 'PCP')} size={56} />
                  <View style={styles.pcpInfo}>
                    <Text style={styles.pcpName}>
                      {pcp.isExternal ? pcp.name : internalDoctor?.name ?? 'Your PCP'}
                    </Text>
                    {pcp.isExternal ? (
                      <>
                        {pcp.practice ? <Text style={styles.pcpSub}>{pcp.practice}</Text> : null}
                        {pcp.phone ? (
                          <View style={styles.pcpDetail}>
                            <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
                            <Text style={styles.pcpDetailText}>{pcp.phone}</Text>
                          </View>
                        ) : null}
                        <View style={[styles.pcpBadge, styles.pcpBadgeExternal]}>
                          <Text style={styles.pcpBadgeText}>External Provider</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        {internalDoctor?.specialty ? (
                          <Text style={styles.pcpSub}>{internalDoctor.specialty}</Text>
                        ) : null}
                        <View style={[styles.pcpBadge, styles.pcpBadgeInternal]}>
                          <Ionicons name="checkmark-circle" size={12} color={TEAL} />
                          <Text style={[styles.pcpBadgeText, { color: TEAL }]}>In our network</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsCard}>
                <TouchableOpacity style={styles.actionRow} onPress={() => setMode('select-internal')} activeOpacity={0.7}>
                  <Ionicons name="swap-horizontal-outline" size={18} color={TEAL} />
                  <Text style={styles.actionText}>Switch to a provider in our network</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.actionRow} onPress={startExternal} activeOpacity={0.7}>
                  <Ionicons name="person-add-outline" size={18} color={TEAL} />
                  <Text style={styles.actionText}>Enter an external provider</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.actionRow} onPress={handleClear} activeOpacity={0.7} disabled={clearing}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Remove PCP</Text>
                  {clearing ? <ActivityIndicator size="small" color={colors.danger} /> : null}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Empty state */}
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="medical-outline" size={36} color={TEAL} />
                </View>
                <Text style={styles.emptyTitle}>No primary care provider set</Text>
                <Text style={styles.emptySubtitle}>
                  Setting a PCP helps us personalise your care. When booking, your PCP's availability will appear first.
                </Text>
              </View>

              <Text style={styles.sectionLabel}>CHOOSE FROM OUR NETWORK</Text>
              {doctorsLoading ? (
                <View style={styles.centered}><ActivityIndicator color={TEAL} /></View>
              ) : doctors.length === 0 ? (
                <Text style={styles.emptySubtitle}>No providers available.</Text>
              ) : (
                <View style={styles.doctorList}>
                  {doctors.map((doc, idx) => (
                    <TouchableOpacity
                      key={doc._id}
                      style={[styles.doctorRow, idx < doctors.length - 1 && styles.doctorRowBorder]}
                      onPress={() => handleSelectInternal(doc._id, doc.name)}
                      activeOpacity={0.7}
                      disabled={saving}
                    >
                      <Avatar name={doc.name} size={44} />
                      <View style={styles.doctorInfo}>
                        <Text style={styles.doctorName}>{doc.name}</Text>
                        {doc.specialty ? <Text style={styles.doctorSpecialty}>{doc.specialty}</Text> : null}
                      </View>
                      {saving ? (
                        <ActivityIndicator size="small" color={TEAL} />
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.externalBtn} onPress={startExternal} activeOpacity={0.8}>
                <Ionicons name="person-add-outline" size={18} color={TEAL} />
                <Text style={styles.externalBtnText}>My provider is not in the list</Text>
                <Ionicons name="chevron-forward" size={16} color={TEAL} />
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      ) : mode === 'select-internal' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>SELECT A PROVIDER</Text>
          {doctorsLoading ? (
            <View style={styles.centered}><ActivityIndicator color={TEAL} /></View>
          ) : (
            <View style={styles.doctorList}>
              {doctors.map((doc, idx) => (
                <TouchableOpacity
                  key={doc._id}
                  style={[styles.doctorRow, idx < doctors.length - 1 && styles.doctorRowBorder]}
                  onPress={() => handleSelectInternal(doc._id, doc.name)}
                  activeOpacity={0.7}
                  disabled={saving}
                >
                  <Avatar name={doc.name} size={44} />
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doc.name}</Text>
                    {doc.specialty ? <Text style={styles.doctorSpecialty}>{doc.specialty}</Text> : null}
                  </View>
                  {saving ? (
                    <ActivityIndicator size="small" color={TEAL} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        /* Enter external PCP */
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>PROVIDER DETAILS</Text>
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Provider Name *</Text>
            <TextInput
              style={styles.input}
              value={extName}
              onChangeText={setExtName}
              placeholder="e.g. Dr. Jane Smith"
              placeholderTextColor={colors.textDisabled}
            />
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={extPhone}
              onChangeText={setExtPhone}
              placeholder="e.g. (555) 123-4567"
              placeholderTextColor={colors.textDisabled}
              keyboardType="phone-pad"
            />
            <Text style={styles.fieldLabel}>Practice / Clinic</Text>
            <TextInput
              style={[styles.input, { marginBottom: 0 }]}
              value={extPractice}
              onChangeText={setExtPractice}
              placeholder="e.g. Family Health Clinic"
              placeholderTextColor={colors.textDisabled}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveExternal}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.saveBtnText}>Save Provider</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: TEAL, paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  backBtn: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.white, letterSpacing: 0.2 },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.base, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  centered: { paddingTop: 60, alignItems: 'center' },

  // PCP card
  pcpCard: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.base,
  },
  pcpCardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pcpInfo: { flex: 1, gap: 4 },
  pcpName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  pcpSub: { fontSize: 13, color: colors.textSecondary },
  pcpDetail: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  pcpDetailText: { fontSize: 13, color: colors.textSecondary },
  pcpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
  },
  pcpBadgeInternal: { backgroundColor: TEAL_LIGHT },
  pcpBadgeExternal: { backgroundColor: colors.gray100 },
  pcpBadgeText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },

  // Actions card
  actionsCard: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.base,
  },
  actionText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border },

  // Empty state
  emptyCard: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, alignItems: 'center', gap: spacing.md,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: TEAL_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.8,
    color: colors.textDisabled, marginBottom: -spacing.sm,
  },

  // Doctor list
  doctorList: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base },
  doctorRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  doctorSpecialty: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  externalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: TEAL_LIGHT, borderRadius: radius.lg, padding: spacing.base,
  },
  externalBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: TEAL },

  // Form
  formCard: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.base,
    gap: spacing.xs,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 15, color: colors.textPrimary, marginBottom: spacing.xs,
  },

  saveBtn: {
    backgroundColor: TEAL, borderRadius: radius.xl,
    paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', minHeight: 50,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
