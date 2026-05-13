import React, { useState } from 'react';
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
import { useGetMeQuery } from '@/services/authApi';
import {
  useUploadDocumentMutation,
  useUpdateDriverLicenseMutation,
  DocType,
} from '@/services/patientApi';

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
        <ActivityIndicator color={colors.primary} />
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
        {imageUrl && (
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function DocumentsScreen() {
  const router = useRouter();
  const { patient } = useAppSelector((s) => s.auth);
  const { data: me } = useGetMeQuery();
  const [uploadDocument] = useUploadDocumentMutation();
  const [updateDriverLicense] = useUpdateDriverLicenseMutation();

  const patientData = me as any;
  const patientId = patient?._id ?? '';

  const [uploading, setUploading] = useState<Partial<Record<DocType, boolean>>>({});
  const [licenseNumber, setLicenseNumber] = useState(patientData?.driverLicense?.number ?? '');
  const [licenseState, setLicenseState] = useState(patientData?.driverLicense?.state ?? '');
  const [licenseExpiry, setLicenseExpiry] = useState(
    patientData?.driverLicense?.expiryDate ?? '',
  );
  const [savingLicense, setSavingLicense] = useState(false);

  const pickAndUpload = async (docType: DocType) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      const camera = await ImagePicker.requestCameraPermissionsAsync();
      if (!camera.granted) {
        Alert.alert('Permission needed', 'Allow access to your camera or photos to upload documents.');
        return;
      }
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
          if (!result.canceled && result.assets[0]) {
            await doUpload(docType, result.assets[0]);
          }
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
          if (!result.canceled && result.assets[0]) {
            await doUpload(docType, result.assets[0]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const doUpload = async (
    docType: DocType,
    asset: ImagePicker.ImagePickerAsset,
  ) => {
    if (!patientId) return;
    setUploading((u) => ({ ...u, [docType]: true }));
    try {
      const fileName = asset.fileName ?? `${docType}-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? 'image/jpeg';
      await uploadDocument({ id: patientId, docType, uri: asset.uri, mimeType, fileName }).unwrap();
      Alert.alert('Uploaded', 'Document saved successfully.');
    } catch {
      Alert.alert('Error', 'Could not upload document. Please try again.');
    } finally {
      setUploading((u) => ({ ...u, [docType]: false }));
    }
  };

  const handleSaveLicense = async () => {
    if (!patientId) return;
    setSavingLicense(true);
    try {
      await updateDriverLicense({
        id: patientId,
        driverLicense: {
          number: licenseNumber || undefined,
          state: licenseState || undefined,
          expiryDate: licenseExpiry || undefined,
        },
      }).unwrap();
      Alert.alert('Saved', 'Driver license info updated.');
    } catch {
      Alert.alert('Error', 'Could not save driver license info.');
    } finally {
      setSavingLicense(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={typography.h4}>Insurance & ID</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Insurance card */}
        <SectionHeader title="Insurance card" />
        <Text style={[typography.bodySmall, styles.hint]}>
          Tap a card to photograph or upload from your photo library.
        </Text>
        <View style={styles.docRow}>
          <DocSlot
            label="Front"
            imageUrl={patientData?.insurance?.cardFrontUrl}
            onPick={() => pickAndUpload('insurance-front')}
            uploading={!!uploading['insurance-front']}
          />
          <DocSlot
            label="Back"
            imageUrl={patientData?.insurance?.cardBackUrl}
            onPick={() => pickAndUpload('insurance-back')}
            uploading={!!uploading['insurance-back']}
          />
        </View>

        {/* Driver license photos */}
        <SectionHeader title="Driver license" />
        <View style={styles.docRow}>
          <DocSlot
            label="Front"
            imageUrl={patientData?.driverLicense?.frontUrl}
            onPick={() => pickAndUpload('license-front')}
            uploading={!!uploading['license-front']}
          />
          <DocSlot
            label="Back"
            imageUrl={patientData?.driverLicense?.backUrl}
            onPick={() => pickAndUpload('license-back')}
            uploading={!!uploading['license-back']}
          />
        </View>

        {/* Driver license info */}
        <SectionHeader title="License details" />
        <View style={styles.fieldGroup}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>License number</Text>
            <TextInput
              style={styles.fieldInput}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="e.g. D1234567"
              placeholderTextColor={colors.gray400}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>State</Text>
            <TextInput
              style={styles.fieldInput}
              value={licenseState}
              onChangeText={setLicenseState}
              placeholder="e.g. CA"
              placeholderTextColor={colors.gray400}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Expiry date</Text>
            <TextInput
              style={styles.fieldInput}
              value={licenseExpiry}
              onChangeText={setLicenseExpiry}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={colors.gray400}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, savingLicense && styles.saveBtnDisabled]}
          onPress={handleSaveLicense}
          disabled={savingLicense}
          activeOpacity={0.85}
        >
          {savingLicense ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save license info</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    marginBottom: spacing.xs,
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
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
});
