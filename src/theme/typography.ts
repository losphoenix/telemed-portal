import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const typography = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    color: colors.textPrimary,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
