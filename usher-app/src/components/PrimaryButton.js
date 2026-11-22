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
  const resolvedTone = TEXT[tone] ? tone : 'accent';
  const background = blocked ? colors.surfaceAlt : ACCENTS[resolvedTone];

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
        <ActivityIndicator color={TEXT[resolvedTone]} />
      ) : (
        <Text
          style={[
            styles.label,
            small && styles.smallLabel,
            { color: TEXT[resolvedTone] },
            blocked && styles.labelBlocked,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const ACCENTS = {
  accent: colors.accentStrong,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
};

const TEXT = {
  accent: colors.bg,
  success: colors.bg,
  danger: colors.white,
  warning: colors.bg,
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
