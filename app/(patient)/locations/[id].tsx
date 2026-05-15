import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';
import { useGetOrgQuery } from '@/services/orgApi';

const TEAL = '#1a7a6e';
const TEAL_LIGHT = '#e8f4f2';

const DAYS_ORDER = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

function formatHours(val: { open: string; close: string } | null): string {
  if (!val) return 'Closed';
  // "09:00" → "9:00 AM"
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };
  return `${fmt(val.open)} – ${fmt(val.close)}`;
}

// Group consecutive days with the same hours into a range label
function groupBusinessHours(
  hours: Record<string, { open: string; close: string } | null>,
): { days: string; hours: string }[] {
  const result: { days: string; hours: string }[] = [];
  let i = 0;

  while (i < DAYS_ORDER.length) {
    const day = DAYS_ORDER[i];
    if (!(day in hours)) { i++; continue; }

    const val = hours[day];
    const hoursLabel = formatHours(val);
    let j = i + 1;

    while (
      j < DAYS_ORDER.length &&
      DAYS_ORDER[j] in hours &&
      formatHours(hours[DAYS_ORDER[j]]) === hoursLabel
    ) {
      j++;
    }

    const dayLabel =
      j - i === 1
        ? day.slice(0, 3)
        : `${day.slice(0, 3)}–${DAYS_ORDER[j - 1].slice(0, 3)}`;

    result.push({ days: dayLabel, hours: hoursLabel });
    i = j;
  }

  return result;
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  icon, label, onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.actionIconCircle}>
        <Ionicons name={icon as any} size={22} color={TEAL} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: org, isLoading } = useGetOrgQuery(id ?? '');

  const phone = org?.contactInfo?.phone ?? org?.phone;
  const address = org?.contactInfo?.address ?? org?.address;
  const hasHours = org?.businessHours && Object.keys(org.businessHours).length > 0;
  const groupedHours = hasHours ? groupBusinessHours(org!.businessHours!) : [];

  const handleCall = () => {
    if (!phone) { Alert.alert('No phone number available.'); return; }
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`).catch(() =>
      Alert.alert('Could not open phone app.'),
    );
  };

  const handleDirections = () => {
    if (!address) { Alert.alert('No address available.'); return; }
    const query = encodeURIComponent(address);
    Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() =>
      Linking.openURL(`https://maps.apple.com/?q=${query}`),
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isLoading ? 'Location' : (org?.name ?? 'Location')}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={TEAL} />
        </View>
      ) : !org ? null : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Photo placeholder */}
          <View style={styles.imgPlaceholder}>
            <Ionicons name="business" size={48} color={TEAL} />
          </View>

          {/* Address */}
          <View style={styles.addressBlock}>
            {address ? (
              <>
                <Text style={styles.addressLine}>{address}</Text>
              </>
            ) : (
              <Text style={styles.addressLine}>Address not available</Text>
            )}
          </View>

          {/* Action buttons: Call Us + Directions */}
          <View style={styles.actionsRow}>
            <ActionBtn icon="call-outline" label="Call Us" onPress={handleCall} />
            <ActionBtn icon="navigate-outline" label="Directions" onPress={handleDirections} />
          </View>

          <View style={styles.divider} />

          {/* Business Hours */}
          {groupedHours.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Office Hours</Text>
              {groupedHours.map(({ days, hours }) => (
                <View key={days} style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>{days}</Text>
                  <Text style={[styles.hoursValue, hours === 'Closed' && styles.hoursClosed]}>
                    {hours}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Contact info */}
          {(phone || org.email || org.contactInfo?.email) && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact</Text>
                {phone && (
                  <TouchableOpacity onPress={handleCall} style={styles.contactRow}>
                    <Ionicons name="call-outline" size={16} color={TEAL} />
                    <Text style={styles.contactText}>{phone}</Text>
                  </TouchableOpacity>
                )}
                {(org.email ?? org.contactInfo?.email) && (
                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={16} color={TEAL} />
                    <Text style={styles.contactText}>
                      {org.email ?? org.contactInfo?.email}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TEAL,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700', color: colors.white,
    flex: 1, textAlign: 'center', marginHorizontal: spacing.sm,
  },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },

  // Photo placeholder
  imgPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Address
  addressBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  addressLine: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Action buttons row
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['2xl'],
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
  },
  actionBtn: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIconCircle: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // Divider
  divider: {
    height: 8,
    backgroundColor: colors.gray100,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },

  // Section
  section: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  // Hours rows
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  hoursDay: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    minWidth: 80,
  },
  hoursValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  hoursClosed: {
    color: colors.danger,
    fontWeight: '500',
  },

  // Contact rows
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contactText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
});
