import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '@/theme';

import { useAppSelector } from '@/store/hooks';
import {
  useGetPatientQuery,
  useUploadDocumentMutation,
  useUpdateInsuranceMutation,
  useUpdateDriverLicenseMutation,
  DocType,
} from '@/services/patientApi';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function DocSlot({
  label,
  imageUrl,
  onPick,
  uploading,
}: {
  label: string;
  imageUrl?: string;
  onPick: () => void;
  uploading: boolean;
}) {
  return (
    <TouchableOpacity style={styles.docSlot} onPress={onPick} activeOpacity={0.85}>
      {uploading ? (
        <View style={styles.docPlaceholder}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.docPlaceholderText}>Uploading…</Text>
        </View>
      ) : imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.docImage} resizeMode="cover" />
      ) : (
        <View style={styles.docPlaceholder}>
          <Ionicons name="camera-outline" size={28} color={colors.gray400} />
          <Text style={styles.docPlaceholderText}>{label}</Text>
        </View>
      )}
      <View style={styles.docSlotLabel}>
        <Text style={typography.caption}>{label}</Text>
        {imageUrl && !uploading && (
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.fieldGroup}>{children}</View>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  maxLength,
  isLast,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  maxLength?: number;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.field, !isLast && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray400}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
    </View>
  );
}

function SaveButton({
  onPress,
  saving,
  label,
}: {
  onPress: () => void;
  saving: boolean;
  label: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
      onPress={onPress}
      disabled={saving}
      activeOpacity={0.85}
    >
      {saving ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <Text style={styles.saveBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DocumentsScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);
  const patientId = patient?._id ?? '';

  const { data: me } = useGetPatientQuery(patientId, { skip: !patientId });
  const [uploadDocument] = useUploadDocumentMutation();
  const [updateInsurance] = useUpdateInsuranceMutation();
  const [updateDriverLicense] = useUpdateDriverLicenseMutation();

  const [uploading, setUploading] = useState<Partial<Record<DocType, boolean>>>({});
  const [ocrNote, setOcrNote] = useState<{ insurance?: 'filled' | 'failed'; license?: 'filled' | 'failed' }>({});

  // ── Insurance fields ──
  const [insProvider, setInsProvider] = useState('');
  const [insMemberId, setInsMemberId] = useState('');
  const [insGroupNumber, setInsGroupNumber] = useState('');
  const [savingInsurance, setSavingInsurance] = useState(false);

  // ── License fields ──
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [savingLicense, setSavingLicense] = useState(false);

  // Populate fields when patient data loads
  useEffect(() => {
    if (!me) return;
    const ins = me.insurance;
    if (ins) {
      if (ins.provider) setInsProvider(ins.provider);
      if (ins.memberId) setInsMemberId(ins.memberId);
      if (ins.groupNumber) setInsGroupNumber(ins.groupNumber);
    }
    const lic = me.driverLicense;
    if (lic) {
      if (lic.number) setLicenseNumber(lic.number);
      if (lic.state) setLicenseState(lic.state);
      if (lic.expiryDate) setLicenseExpiry(lic.expiryDate);
    }
  }, [me]);

  // ── Upload + OCR ──────────────────────────────────────────────────────────

  const pickAndUpload = async (docType: DocType) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const hasLibrary = permission.granted;
    const hasCameraPerms = hasLibrary
      ? true
      : (await ImagePicker.requestCameraPermissionsAsync()).granted;

    if (!hasLibrary && !hasCameraPerms) {
      Alert.alert('Permission needed', 'Allow access to your camera or photos.');
      return;
    }

    Alert.alert('Upload document', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            quality: 0.85,
            allowsEditing: true,
            aspect: [16, 10],
          });
          if (!result.canceled && result.assets[0]) doUpload(docType, result.assets[0]);
        },
      },
      {
        text: 'Photo library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.85,
            allowsEditing: true,
            aspect: [16, 10],
          });
          if (!result.canceled && result.assets[0]) doUpload(docType, result.assets[0]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const doUpload = async (docType: DocType, asset: ImagePicker.ImagePickerAsset) => {
    if (!patientId) return;
    setUploading((u) => ({ ...u, [docType]: true }));
    try {
      const fileName = asset.fileName ?? `${docType}-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const result = await uploadDocument({
        id: patientId,
        docType,
        uri: asset.uri,
        mimeType,
        fileName,
      }).unwrap();

      // Auto-fill form fields from OCR (only non-null values)
      const ocr = result.ocrFields ?? {};
      if (docType === 'insurance-front') {
        if (ocr.provider) setInsProvider(String(ocr.provider));
        if (ocr.memberId) setInsMemberId(String(ocr.memberId));
        if (ocr.groupNumber) setInsGroupNumber(String(ocr.groupNumber));
        const filled = !!(ocr.provider || ocr.memberId || ocr.groupNumber);
        setOcrNote((n) => ({ ...n, insurance: filled ? 'filled' : 'failed' }));

        if (result.pcpExtracted) {
          Alert.alert(
            'PCP Found',
            `Your primary care physician "${ocr.pcpName}" was detected on your insurance card and saved to your profile.`,
          );
        }
      }
      if (docType === 'license-front') {
        if (ocr.number) setLicenseNumber(String(ocr.number));
        if (ocr.state) setLicenseState(String(ocr.state));
        if (ocr.expiryDate) setLicenseExpiry(String(ocr.expiryDate));
        const filled = !!(ocr.number || ocr.state || ocr.expiryDate);
        setOcrNote((n) => ({ ...n, license: filled ? 'filled' : 'failed' }));
      }
    } catch {
      Alert.alert('Error', 'Could not upload document. Please try again.');
    } finally {
      setUploading((u) => ({ ...u, [docType]: false }));
    }
  };

  // ── Save handlers ─────────────────────────────────────────────────────────

  const handleSaveInsurance = async () => {
    if (!patientId) return;
    setSavingInsurance(true);
    try {
      await updateInsurance({
        id: patientId,
        insurance: {
          cardFrontUrl: me?.insurance?.cardFrontUrl,
          cardBackUrl: me?.insurance?.cardBackUrl,
          provider: insProvider || undefined,
          memberId: insMemberId || undefined,
          groupNumber: insGroupNumber || undefined,
        },
      }).unwrap();
      Alert.alert('Saved', 'Insurance info updated.');
    } catch {
      Alert.alert('Error', 'Could not save insurance info.');
    } finally {
      setSavingInsurance(false);
    }
  };

  const handleSaveLicense = async () => {
    if (!patientId) return;
    setSavingLicense(true);
    try {
      await updateDriverLicense({
        id: patientId,
        driverLicense: {
          frontUrl: me?.driverLicense?.frontUrl,
          backUrl: me?.driverLicense?.backUrl,
          number: licenseNumber || undefined,
          state: licenseState || undefined,
          expiryDate: licenseExpiry || undefined,
        },
      }).unwrap();
      Alert.alert('Saved', 'Driver license info updated.');
    } catch {
      Alert.alert('Error', 'Could not save license info.');
    } finally {
      setSavingLicense(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const isInsuranceUploading =
    !!uploading['insurance-front'] || !!uploading['insurance-back'];
  const isLicenseUploading =
    !!uploading['license-front'] || !!uploading['license-back'];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={typography.h4}>Insurance & ID</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Insurance Card ── */}
        <SectionHeader title="Insurance Card" />
        <Text style={[typography.bodySmall, styles.hint]}>
          Upload front &amp; back. Front is scanned to auto-fill details below — verify before saving.
        </Text>
        <View style={styles.docRow}>
          <DocSlot
            label="Front"
            imageUrl={me?.insurance?.cardFrontUrl}
            onPick={() => pickAndUpload('insurance-front')}
            uploading={!!uploading['insurance-front']}
          />
          <DocSlot
            label="Back"
            imageUrl={me?.insurance?.cardBackUrl}
            onPick={() => pickAndUpload('insurance-back')}
            uploading={!!uploading['insurance-back']}
          />
        </View>

        <SectionHeader title="Insurance Details" />
        {ocrNote.insurance === 'failed' && (
          <Text style={styles.ocrFailed}>
            Couldn't read card — please fill in details manually.
          </Text>
        )}
        <FieldGroup>
          <Field
            label="Insurance company"
            value={insProvider}
            onChangeText={setInsProvider}
            placeholder="e.g. Blue Cross Blue Shield"
          />
          <Field
            label="Member ID"
            value={insMemberId}
            onChangeText={setInsMemberId}
            placeholder="e.g. XYZ123456789"
            autoCapitalize="characters"
          />
          <Field
            label="Group number"
            value={insGroupNumber}
            onChangeText={setInsGroupNumber}
            placeholder="e.g. 12345"
            isLast
          />
        </FieldGroup>
        <SaveButton
          onPress={handleSaveInsurance}
          saving={savingInsurance || isInsuranceUploading}
          label="Save insurance info"
        />

        {/* ── Driver License ── */}
        <SectionHeader title="Driver License" />
        <Text style={[typography.bodySmall, styles.hint]}>
          Upload front &amp; back. Front is scanned to auto-fill details below — verify before saving.
        </Text>
        <View style={styles.docRow}>
          <DocSlot
            label="Front"
            imageUrl={me?.driverLicense?.frontUrl}
            onPick={() => pickAndUpload('license-front')}
            uploading={!!uploading['license-front']}
          />
          <DocSlot
            label="Back"
            imageUrl={me?.driverLicense?.backUrl}
            onPick={() => pickAndUpload('license-back')}
            uploading={!!uploading['license-back']}
          />
        </View>

        <SectionHeader title="License Details" />
        {ocrNote.license === 'failed' && (
          <Text style={styles.ocrFailed}>
            Couldn't read license — please fill in details manually.
          </Text>
        )}
        <FieldGroup>
          <Field
            label="License number"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholder="e.g. D1234567"
            autoCapitalize="characters"
          />
          <Field
            label="State"
            value={licenseState}
            onChangeText={setLicenseState}
            placeholder="e.g. CA"
            autoCapitalize="characters"
            maxLength={2}
          />
          <Field
            label="Expiry date"
            value={licenseExpiry}
            onChangeText={setLicenseExpiry}
            placeholder="MM/DD/YYYY"
            keyboardType="numbers-and-punctuation"
            isLast
          />
        </FieldGroup>
        <SaveButton
          onPress={handleSaveLicense}
          saving={savingLicense || isLicenseUploading}
          label="Save license info"
        />

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  content: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing['4xl'],
  },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },

  hint: {
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },

  docRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  docSlot: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  docPlaceholder: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray50,
    gap: spacing.xs,
  },

  docPlaceholderText: {
    fontSize: 12,
    color: colors.gray400,
  },

  docImage: {
    width: '100%',
    height: 110,
  },

  docSlotLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },

  fieldGroup: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  field: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },

  fieldBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },

  fieldLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },

  fieldInput: {
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 2,
  },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveBtnDisabled: {
    opacity: 0.6,
  },

  saveBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },

  ocrFailed: {
    fontSize: 12,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
