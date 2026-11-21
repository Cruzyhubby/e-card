import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Icon from './Icon';
import { colors, radius, spacing, typography } from '../theme';

export default function Field({
  label,
  hint,
  icon,
  rightAction,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const disabled = inputProps.editable === false;

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          focused && styles.wrapFocused,
          disabled && styles.wrapDisabled,
        ]}
      >
        {icon ? (
          <View style={styles.icon}>
            <Icon name={icon} size={16} color={focused ? colors.accent : colors.textMuted} />
          </View>
        ) : null}
        <TextInput
          {...inputProps}
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            rightAction && styles.inputWithAction,
            inputStyle,
          ]}
          placeholderTextColor={colors.textDim}
          selectionColor={colors.accent}
          onFocus={(event) => {
            setFocused(true);
            if (onFocus) onFocus(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            if (onBlur) onBlur(event);
          }}
        />
        {rightAction ? (
          <Pressable
            onPress={rightAction.onPress}
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel={rightAction.label}
          >
            <Text style={styles.actionText}>{rightAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
  },
  wrapFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  wrapDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  icon: {
    paddingLeft: 13,
    paddingRight: 2,
  },
  input: {
    flex: 1,
    minHeight: 46,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...typography.body,
    fontSize: 14,
  },
  inputWithIcon: {
    paddingLeft: 10,
  },
  inputWithAction: {
    paddingRight: 4,
  },
  action: {
    minHeight: 38,
    paddingHorizontal: 10,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    ...typography.label,
    color: colors.accentText,
    fontSize: 12,
  },
  hint: {
    ...typography.small,
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
});
