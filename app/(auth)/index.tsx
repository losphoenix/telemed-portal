import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/theme';

const { width: SW, height: SH } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: 'medical-outline' as const,
    heroBg: '#DBEAFE',
    iconColor: colors.primary,
    heading: 'Care that comes\nto you',
    bullets: [
      'Easy booking of same and next-day appointments',
      'On-demand telehealth visits, 24/7',
      'Prescription refills & renewals',
      'Secure messaging with your care team',
    ],
  },
  {
    id: '2',
    icon: 'calendar-outline' as const,
    heroBg: '#D1FAE5',
    iconColor: colors.success,
    heading: 'Easily book\nappointments in app',
    bullets: [
      'Primary care & specialist referrals',
      'Annual wellness visits',
      'Chronic condition management',
      'Mental health support',
    ],
  },
  {
    id: '3',
    icon: 'shield-checkmark-outline' as const,
    heroBg: '#EDE9FE',
    iconColor: '#7C3AED',
    heading: 'Secure &\nprivate by design',
    bullets: [
      'HIPAA-compliant platform',
      'End-to-end encrypted communications',
      'Your data is never sold',
      'Full control over your health records',
    ],
  },
];

const HERO_H = Math.round(SH * 0.30);
const BUTTONS_H = 140;
const DOTS_H = 40;

export default function IntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setCurrentIndex(idx);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.carousel}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            {/* Hero image area */}
            <View style={[styles.hero, { backgroundColor: slide.heroBg }]}>
              <Ionicons name={slide.icon} size={96} color={slide.iconColor} />
            </View>

            {/* Text content */}
            <View style={styles.content}>
              <Text style={[typography.h1, styles.heading]}>{slide.heading}</Text>
              <View style={styles.bullets}>
                {slide.bullets.map((text, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.dot}>·</Text>
                    <Text style={[typography.body, styles.bulletText]}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Page dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dotIndicator, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* CTA buttons */}
      <View style={[styles.buttons, { paddingBottom: insets.bottom + spacing.base }]}>
        <TouchableOpacity
          style={styles.btnLogin}
          activeOpacity={0.85}
          onPress={() =>
            router.push({ pathname: '/(auth)/sign-in', params: { mode: 'login' } })
          }
        >
          <Text style={styles.btnLoginText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSignup}
          activeOpacity={0.85}
          onPress={() =>
            router.push({ pathname: '/(auth)/sign-in', params: { mode: 'signup' } })
          }
        >
          <Text style={styles.btnSignupText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  carousel: {
    flex: 1,
  },
  slide: {
    width: SW,
  },
  hero: {
    height: HERO_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    gap: spacing.lg,
  },
  heading: {
    lineHeight: 40,
  },
  bullets: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  dot: {
    fontSize: 22,
    color: colors.primary,
    lineHeight: 23,
  },
  bulletText: {
    flex: 1,
    color: colors.textSecondary,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    height: DOTS_H,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray200,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
  buttons: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  btnLogin: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  btnLoginText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  btnSignup: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  btnSignupText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
