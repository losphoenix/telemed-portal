import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components';
import { colors, spacing, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { useGetServicesQuery } from '@/services/orgApi';
import {
  useGetAvailableSlotsQuery,
  useBookAppointmentMutation,
  DoctorSlots,
  TimeSlot,
} from '@/services/appointmentApi';

type Step = 'service' | 'slots' | 'confirmed';
type DeliveryFilter = 'all' | 'in_person' | 'video';

interface BookingState {
  serviceId?: string;
  serviceName?: string;
  doctorId?: string;
  doctorName?: string;
  orgId?: string;
  slot?: TimeSlot;
  duration?: number;
  price?: number;
  deliveryMode?: string;
}

const TEAL = '#1a7a6e';
const TEAL_DARK = '#145f55';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatDateLabel(date: Date): string {
  const todayStr = toDateStr(new Date());
  const dateStr = toDateStr(date);
  if (dateStr === todayStr)
    return `Today ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  if (dateStr === toDateStr(addDays(new Date(), 1)))
    return `Tomorrow ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

function openCalendar(iso: string, title: string, durationMin: number) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMin * 60000);
  if (Platform.OS === 'ios') {
    Linking.openURL(`calshow:${Math.floor(start.getTime() / 1000)}`).catch(() => null);
  } else {
    Linking.openURL(
      `content://com.android.calendar/time/${start.getTime()}` +
      `?title=${encodeURIComponent(title)}&beginTime=${start.getTime()}&endTime=${end.getTime()}`
    ).catch(() => null);
  }
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label, icon, active, onPress,
}: { label: string; icon?: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={13}
          color={active ? colors.white : colors.textSecondary}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Section divider (thick grey) ────────────────────────────────────────────

function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

// ─── Doctor slot row ──────────────────────────────────────────────────────────

function DoctorSlotRow({
  ds, selectedSlotStart, selectedDoctorId, onSelectSlot,
}: {
  ds: DoctorSlots;
  selectedSlotStart?: string;
  selectedDoctorId?: string;
  onSelectSlot: (ds: DoctorSlots, slot: TimeSlot) => void;
}) {
  const isVideo = ds.deliveryMode === 'video';
  return (
    <View style={styles.doctorRow}>
      <View style={styles.avatarWrap}>
        <Avatar name={ds.doctorName} size={48} />
        {isVideo && (
          <View style={styles.videoBadge}>
            <Ionicons name="videocam" size={10} color={colors.white} />
          </View>
        )}
      </View>
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>{ds.doctorName}</Text>
        <Text style={styles.doctorSubtitle}>
          {isVideo ? 'Remote Visit over Zoom' : 'In-Office Visit'}
        </Text>
        <Text style={styles.slotsAvailable}>
          {ds.slots.length} {ds.slots.length === 1 ? 'appointment' : 'appointments'} available
        </Text>
        <View style={styles.slotRow}>
          {ds.slots.slice(0, 4).map((slot, i) => {
            const selected = selectedDoctorId === ds.doctorId && selectedSlotStart === slot.start;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => onSelectSlot(ds, slot)}
                style={[styles.slotBtn, selected && styles.slotBtnSelected]}
                activeOpacity={0.8}
              >
                <Text style={styles.slotBtnText}>{formatTime(slot.start)}</Text>
              </TouchableOpacity>
            );
          })}
          {ds.slots.length > 4 && (
            <Text style={styles.moreSlots}>+{ds.slots.length - 4} more</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Booking Confirmation view (shared between post-book and detail) ──────────

export function BookingConfirmationView({
  serviceName,
  duration,
  scheduledAt,
  doctorName,
  deliveryMode,
  notes,
  onDone,
  onCancel,
  canCancel,
  isCancelling,
  joinButton,
  intakeFormRow,
}: {
  serviceName: string;
  duration: number;
  scheduledAt: string;
  doctorName: string;
  deliveryMode: string;
  notes?: string;
  onDone: () => void;
  onCancel?: () => void;
  canCancel?: boolean;
  isCancelling?: boolean;
  joinButton?: React.ReactNode;
  intakeFormRow?: React.ReactNode;
}) {
  const isVideo = deliveryMode === 'video';
  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.confirmContent}>
        {/* Service title */}
        <View style={styles.confirmHeader}>
          <Text style={styles.confirmServiceName}>{serviceName}</Text>
          <Text style={styles.confirmDuration}>Typically {duration} minutes</Text>
        </View>

        <SectionDivider />

        {/* Date/time */}
        <Text style={styles.confirmDateTime}>{formatFull(scheduledAt)}</Text>

        {/* Doctor */}
        <View style={styles.confirmDoctorRow}>
          <View style={styles.avatarWrap}>
            <Avatar name={doctorName} size={44} />
            {isVideo && (
              <View style={styles.videoBadge}>
                <Ionicons name="videocam" size={10} color={colors.white} />
              </View>
            )}
          </View>
          <View>
            <Text style={styles.confirmDoctorName}>{doctorName}</Text>
            <Text style={styles.confirmDoctorSub}>{isVideo ? 'Video call' : 'In-office visit'}</Text>
          </View>
        </View>

        <SectionDivider />

        {/* Billing + insurance */}
        <View style={styles.confirmRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.confirmRowTitle}>Visit billed to you (self-pay)</Text>
            <Text style={styles.confirmRowSubtitle}>Fees may vary. Message us for an estimate.</Text>
          </View>
          <TouchableOpacity
            onPress={() => Alert.alert('Add Insurance', 'Insurance setup coming soon.')}
            activeOpacity={0.7}
          >
            <Text style={styles.confirmAction}>Add Insurance</Text>
          </TouchableOpacity>
        </View>

        <SectionDivider />

        {/* Preferred pharmacy */}
        <TouchableOpacity
          style={styles.confirmRow}
          onPress={() => Alert.alert('Pharmacy', 'Preferred pharmacy selection coming soon.')}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.confirmRowTitle}>Choose a preferred pharmacy</Text>
            <Text style={styles.confirmRowSubtitle}>
              Your prescriptions are sent here by default. You can change this anytime.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
        </TouchableOpacity>

        <SectionDivider />

        {/* Add to Calendar */}
        <View style={styles.confirmRow}>
          <Text style={styles.confirmRowTitle}>Add to Calendar</Text>
          <TouchableOpacity
            onPress={() => openCalendar(scheduledAt, `${serviceName} – ${doctorName}`, duration)}
            activeOpacity={0.7}
          >
            <Text style={styles.confirmAction}>Add</Text>
          </TouchableOpacity>
        </View>

        <SectionDivider />

        {/* Notes */}
        <View style={styles.confirmNotesSection}>
          <Text style={styles.confirmRowTitle}>Notes for your Visit</Text>
          <View style={styles.confirmNoteRow}>
            <Ionicons
              name={isVideo ? 'videocam-outline' : 'location-outline'}
              size={18}
              color={colors.textSecondary}
              style={{ marginTop: 2 }}
            />
            <Text style={styles.confirmNoteText}>
              {isVideo
                ? 'This visit will be conducted over a secure video call. A link will be sent to you before the appointment.'
                : 'Please arrive 10 minutes early. Bring a valid ID and your insurance card.'}
            </Text>
          </View>
          {notes ? (
            <View style={[styles.confirmNoteRow, { marginTop: spacing.sm }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <Text style={styles.confirmNoteText}>{notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Intake Form row — injected from detail screen */}
        {intakeFormRow && (
          <>
            <SectionDivider />
            {intakeFormRow}
          </>
        )}

        {/* Cancel — small text link at the bottom of the scroll */}
        {canCancel && onCancel && (
          <View style={styles.cancelSection}>
            <Text style={styles.cancelPolicy}>
              Free cancellation up to 24 hours before your visit. Late cancellations may incur a no-show fee.
            </Text>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.6}
              disabled={isCancelling}
            >
              {isCancelling
                ? <ActivityIndicator size='small' color={colors.textSecondary} />
                : <Text style={styles.cancelLinkText}>Cancel Appointment</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.stickyFooter}>
        {joinButton}
        <TouchableOpacity style={styles.ctaBtn} onPress={onDone} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookScreen() {
  const router = useRouter();
  const { patient, token } = useAppSelector((s) => s.auth);

  const patientId =
    patient?._id ??
    (() => {
      try { return JSON.parse(atob(token!.split('.')[1])).id as string; }
      catch { return null; }
    })();

  const [step, setStep] = useState<Step>('service');
  const [booking, setBooking] = useState<BookingState>({});
  const [viewDate, setViewDate] = useState(new Date());
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all');

  const { data: services, isLoading: servicesLoading } = useGetServicesQuery();

  const { data: allDoctorSlots, isLoading: slotsLoading } = useGetAvailableSlotsQuery(
    { serviceId: booking.serviceId ?? '', date: toDateStr(viewDate) },
    { skip: !booking.serviceId || step !== 'slots' },
  );

  const doctorSlots = useMemo(() => {
    if (!allDoctorSlots) return [];
    if (deliveryFilter === 'all') return allDoctorSlots;
    return allDoctorSlots.filter((ds) => ds.deliveryMode === deliveryFilter);
  }, [allDoctorSlots, deliveryFilter]);

  const [bookAppointment, { isLoading: isCreating }] = useBookAppointmentMutation();

  const goBack = () => {
    if (step === 'slots') { setStep('service'); return; }
    if (step === 'confirmed') { router.replace('/(patient)/appointments/index'); return; }
    router.back();
  };

  const handleSelectSlot = (ds: DoctorSlots, slot: TimeSlot) => {
    setBooking((b) => ({
      ...b,
      doctorId: ds.doctorId,
      doctorName: ds.doctorName,
      orgId: ds.orgId,
      slot,
      duration: ds.duration,
      price: ds.price,
      deliveryMode: ds.deliveryMode,
    }));
  };

  const handleBook = async () => {
    if (!booking.doctorId || !booking.serviceId || !booking.slot || !patientId || !booking.orgId) return;
    try {
      await bookAppointment({
        serviceId: booking.serviceId,
        doctorId: booking.doctorId,
        orgId: booking.orgId,
        patientId,
        scheduledAt: booking.slot.start,
      }).unwrap();
      setStep('confirmed');
    } catch {
      Alert.alert('Error', 'Could not book appointment. Please try again.');
    }
  };

  const isConfirmed = step === 'confirmed';
  const headerTitle = isConfirmed ? 'Booking Confirmation' : 'Book Visit';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        {!isConfirmed ? (
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Service ── */}
      {step === 'service' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>I want to be seen for...</Text>
          {servicesLoading ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={TEAL} /></View>
          ) : (
            (services ?? []).map((svc, idx) => (
              <TouchableOpacity
                key={svc._id}
                onPress={() => {
                  setBooking({ serviceId: svc._id, serviceName: svc.name });
                  setViewDate(new Date());
                  setDeliveryFilter('all');
                  setStep('slots');
                }}
                activeOpacity={0.7}
                style={[styles.serviceRow, idx < (services ?? []).length - 1 && styles.serviceRowBorder]}
              >
                <Text style={styles.serviceName}>{svc.name}</Text>
                {svc.description && <Text style={styles.serviceDesc}>{svc.description}</Text>}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Slots ── */}
      {step === 'slots' && (
        <>
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <FilterChip
                label="In Office" icon="business-outline"
                active={deliveryFilter === 'in_person'}
                onPress={() => setDeliveryFilter((c) => c === 'in_person' ? 'all' : 'in_person')}
              />
              <FilterChip
                label="Remote" icon="videocam-outline"
                active={deliveryFilter === 'video'}
                onPress={() => setDeliveryFilter((c) => c === 'video' ? 'all' : 'telehealth')}
              />
              <FilterChip label="Locations" active={false} onPress={() => {}} />
              <FilterChip label="Dates" active={false} onPress={() => {}} />
            </ScrollView>
          </View>

          <View style={styles.dateNav}>
            <TouchableOpacity
              onPress={() => { setViewDate((d) => addDays(d, -1)); setBooking((b) => ({ ...b, slot: undefined, doctorId: undefined })); }}
              style={styles.dateNavArrow}
            >
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.dateNavLabel}>{formatDateLabel(viewDate)}</Text>
            <TouchableOpacity
              onPress={() => { setViewDate((d) => addDays(d, 1)); setBooking((b) => ({ ...b, slot: undefined, doctorId: undefined })); }}
              style={styles.dateNavArrow}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {slotsLoading ? (
              <View style={styles.loadingWrap}><ActivityIndicator color={TEAL} /></View>
            ) : !doctorSlots.length ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="calendar-outline" size={40} color={colors.gray300} />
                <Text style={styles.emptyText}>No availability on this day.</Text>
                <Text style={styles.emptySubtext}>Try navigating to another date.</Text>
              </View>
            ) : (
              doctorSlots.map((ds, idx) => (
                <View key={ds.doctorId}>
                  <DoctorSlotRow
                    ds={ds}
                    selectedDoctorId={booking.doctorId}
                    selectedSlotStart={booking.slot?.start}
                    onSelectSlot={handleSelectSlot}
                  />
                  {idx < doctorSlots.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </ScrollView>

          {booking.slot && (
            <View style={styles.stickyFooter}>
              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={handleBook}
                activeOpacity={0.85}
                disabled={isCreating}
              >
                {isCreating
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.ctaBtnText}>Book Visit</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* ── Confirmed ── */}
      {step === 'confirmed' && booking.slot && (
        <BookingConfirmationView
          serviceName={booking.serviceName ?? ''}
          duration={booking.duration ?? 30}
          scheduledAt={booking.slot.start}
          doctorName={booking.doctorName ?? ''}
          deliveryMode={booking.deliveryMode ?? 'video'}
          onDone={() => router.replace('/(patient)/appointments/index')}
        />
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.white, letterSpacing: 0.2 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['2xl'] },

  // Service
  sectionLabel: {
    fontSize: 13, color: colors.textSecondary,
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  serviceRow: { paddingHorizontal: spacing.base, paddingVertical: spacing.base },
  serviceRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  serviceName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  serviceDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // Slots
  filterBar: { backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  filterScroll: { flexDirection: 'row', paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.sm },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white,
  },
  filterChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  filterChipText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  filterChipTextActive: { color: colors.white },
  dateNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  dateNavArrow: { padding: spacing.sm },
  dateNavLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'center' },
  doctorRow: {
    flexDirection: 'row', paddingHorizontal: spacing.base, paddingVertical: spacing.base,
    gap: spacing.md, alignItems: 'flex-start',
  },
  avatarWrap: { position: 'relative' },
  videoBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.white,
  },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  doctorSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  slotsAvailable: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotBtn: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.md, backgroundColor: TEAL },
  slotBtnSelected: {
    backgroundColor: TEAL_DARK, borderWidth: 2, borderColor: colors.white,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 3,
  },
  slotBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  moreSlots: { fontSize: 13, color: colors.textSecondary, alignSelf: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: spacing.base },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm },
  emptySubtext: { fontSize: 13, color: colors.textDisabled },

  // Shared footer + CTA
  stickyFooter: {
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.white,
    gap: spacing.sm,
  },
  ctaBtn: {
    backgroundColor: TEAL, borderRadius: radius.xl,
    paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', minHeight: 50,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  cancelSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  cancelPolicy: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  cancelLinkText: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },

  // Confirmation
  confirmContent: { paddingBottom: spacing['2xl'] },
  confirmHeader: { paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md },
  confirmServiceName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  confirmDuration: { fontSize: 14, color: colors.textSecondary },
  confirmDateTime: {
    fontSize: 15, fontWeight: '600', color: colors.textPrimary,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  confirmDoctorRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingBottom: spacing.base,
  },
  confirmDoctorName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  confirmDoctorSub: { fontSize: 13, color: colors.textSecondary },
  confirmRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.base, gap: spacing.md,
  },
  confirmRowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  confirmRowSubtitle: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  confirmAction: { fontSize: 14, fontWeight: '600', color: TEAL },
  confirmNotesSection: { paddingHorizontal: spacing.base, paddingVertical: spacing.base },
  confirmNoteRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  confirmNoteText: { fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 18 },
  sectionDivider: {
    height: 8, backgroundColor: colors.gray100,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
});
