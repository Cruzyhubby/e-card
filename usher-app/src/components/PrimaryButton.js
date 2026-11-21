import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, typography } from '../theme';

export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  tone = 'accent',
  small = false,
  style,
}) {
  const blocked = disabled || loading;
  const background = blocked ? colors.surfaceAlt : ACCENTS[tone] || colors.accentStrong;

  return (
    <Pressable
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: background, borderColor: blocked ? colors.border : background },
        pressed && !blocked && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={[styles.label, small && styles.smallLabel, blocked && styles.labelBlocked]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const ACCENTS = {
  accent: '#2563EB',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  small: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.86,
  },
  label: {
    ...typography.body,
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  smallLabel: {
    fontSize: 13,
  },
  labelBlocked: {
    color: colors.textDim,
  },
});
