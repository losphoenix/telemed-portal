import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Button, Card } from '@/components';
import { colors, spacing, typography, radius } from '@/theme';
import { useGetAppointmentQuery } from '@/services/appointmentApi';
import { useGetVideoSessionByAppointmentQuery, useJoinVideoSessionMutation } from '@/services/videoSessionApi';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useRoomContext,
  isTrackReference,
  registerGlobals,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

const isExpoGo = Constants.appOwnership === 'expo';

export default function JoinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!isExpoGo) registerGlobals();
  }, []);

  const { data: appt, isLoading: apptLoading } = useGetAppointmentQuery(id ?? '');
  const { data: session, isLoading: sessionLoading } = useGetVideoSessionByAppointmentQuery(
    id ?? '',
    { skip: !id },
  );

  const [inCall, setInCall] = useState(false);
  const [joinSession] = useJoinVideoSessionMutation();

  const isLoading = apptLoading || sessionLoading;

  const handleJoin = async () => {
    if (isExpoGo) {
      Alert.alert('Development build required', 'Video calls are not supported in Expo Go. Run yarn ios or use an EAS development build.');
      return;
    }
    if (!session) {
      Alert.alert('Not ready', 'No video session has been set up for this appointment yet.');
      return;
    }
    // Mark session as in_progress so the other party's client unlocks immediately
    try {
      await joinSession(session._id).unwrap();
    } catch {
      // Non-fatal — proceed to join even if the status update fails
    }
    setInCall(true);
  };

  const handleLeave = () => {
    setInCall(false);
    router.back();
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // ── Active call ─────────────────────────────────────────────────────────────
  if (inCall && session && !isExpoGo) {
    return (
      <LiveKitRoom
        serverUrl={session.roomUrl}
        token={session.patientToken}
        connect
        audio
        video
        style={{ flex: 1 }}
        onDisconnected={handleLeave}
        onError={(err) => {
          Alert.alert('Connection error', err.message);
          setInCall(false);
        }}
      >
        <CallView onLeave={handleLeave} />
      </LiveKitRoom>
    );
  }

  // ── Pre-join preview ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.videoIcon}>
          <Ionicons name="videocam" size={40} color={colors.white} />
        </View>

        <Text style={typography.h2}>Ready to join?</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Your telehealth visit with{' '}
          <Text style={{ fontWeight: '600' }}>
            {(appt?.doctorId as any)?.name}
          </Text>{' '}
          is confirmed.
        </Text>

        <Card style={styles.infoCard}>
          <Text style={typography.bodySmall}>
            Scheduled for{' '}
            {appt?.scheduledAt
              ? new Date(appt.scheduledAt).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </Text>
          <Text style={[typography.caption, { marginTop: spacing.xs }]}>
            {(appt?.serviceId as any)?.name}
          </Text>
        </Card>

        <View style={styles.checklist}>
          {['Camera and microphone allowed', 'Quiet, well-lit space', 'Stable internet connection'].map(
            (item) => (
              <View key={item} style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={typography.bodySmall}>{item}</Text>
              </View>
            ),
          )}
        </View>

        <Button
          label="Join visit now"
          onPress={handleJoin}
          disabled={!session}
          style={styles.joinBtn}
        />

        <Button
          label="Go back"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}

// ── In-call view (rendered inside LiveKitRoom which provides RoomContext) ─────
function CallView({ onLeave }: { onLeave: () => void }) {
  const room = useRoomContext();
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  // Fetch all camera track references (local + remote).
  // onlySubscribed: false avoids the circular dependency where adaptive streaming
  // won't subscribe a track until a VideoTrack component renders it, but useTracks
  // won't return the track until it's subscribed. Especially needed on iOS simulator.
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });

  const remoteTrack = cameraTracks.find(
    (t) => isTrackReference(t) && !t.participant.isLocal,
  );
  const localTrack = cameraTracks.find(
    (t) => isTrackReference(t) && t.participant.isLocal,
  );

  const toggleMic = async () => {
    const next = !micEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  };

  const toggleCamera = async () => {
    const next = !cameraEnabled;
    await room.localParticipant.setCameraEnabled(next);
    setCameraEnabled(next);
  };

  const handleLeave = async () => {
    await room.disconnect();
    onLeave();
  };

  return (
    <View style={styles.callContainer}>
      {/* Remote video — fills the screen */}
      {isTrackReference(remoteTrack) ? (
        <VideoTrack trackRef={remoteTrack} style={styles.remoteVideo} objectFit="cover" />
      ) : (
        <View style={styles.waitingContainer}>
          <ActivityIndicator color={colors.white} size="large" />
          <Text style={styles.waitingText}>Waiting for the other participant…</Text>
        </View>
      )}

      {/* Local video — picture-in-picture corner */}
      {isTrackReference(localTrack) && cameraEnabled && (
        <View style={styles.localVideoWrapper}>
          <VideoTrack trackRef={localTrack} style={styles.localVideo} mirror objectFit="cover" />
        </View>
      )}

      {/* Control bar */}
      <SafeAreaView style={styles.controlsSafe} edges={['bottom']}>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, !micEnabled && styles.controlBtnOff]}
            onPress={toggleMic}
          >
            <Ionicons name={micEnabled ? 'mic' : 'mic-off'} size={22} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.endBtn} onPress={handleLeave}>
            <Ionicons name="call" size={26} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, !cameraEnabled && styles.controlBtnOff]}
            onPress={toggleCamera}
          >
            <Ionicons
              name={cameraEnabled ? 'videocam' : 'videocam-off'}
              size={22}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Pre-join
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: {
    flex: 1,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.lg,
  },
  videoIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  infoCard: {
    width: '100%',
    alignItems: 'center',
  },
  checklist: {
    width: '100%',
    gap: spacing.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  joinBtn: {
    width: '100%',
    marginTop: spacing.sm,
  },

  // Active call
  callContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  waitingText: {
    color: colors.white,
    fontSize: 16,
    opacity: 0.8,
  },
  localVideoWrapper: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  localVideo: {
    flex: 1,
  },
  controlsSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnOff: {
    backgroundColor: '#dc2626',
  },
  endBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '135deg' }],
  },
});
