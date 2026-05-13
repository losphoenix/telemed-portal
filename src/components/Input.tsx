import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  secureToggle?: boolean;
}

export function Input({
  label,
  error,
  containerStyle,
  secureToggle,
  secureTextEntry,
  ...props
}: InputProps) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[typography.label, styles.label]}>{label}</Text>}
      <View style={[styles.inputRow, error ? styles.inputError : styles.inputNormal]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={hidden}
          autoCapitalize="none"
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} style={styles.eye}>
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.gray400}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  inputNormal: {
    borderColor: colors.border,
  },
  inputError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  eye: {
    padding: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
});
