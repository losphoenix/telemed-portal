import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, radius } from '@/theme';

interface AvatarProps {
  name?: string;
  uri?: string;
  size?: number;
}

export function Avatar({ name, uri, size = 40 }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.primary,
    fontWeight: '700',
  },
});
