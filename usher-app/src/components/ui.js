import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export function PageHead({ kicker, title, right }) {
  return (
    <View style={styles.pageHead}>
      <View style={styles.pageHeadText}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {right || null}
    </View>
  );
}

export function Card({ children, style, compact = false }) {
  return <View style={[styles.card, compact && styles.cardCompact, style]}>{children}</View>;
}

export function SectionHead({ title, right }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right || null}
    </View>
  );
}

export function GhostButton({ label, onPress, tone = 'accent' }) {
  const color = tone === 'danger' ? colors.danger : colors.accent;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Text style={[styles.ghostText, { color }]}>{label}</Text>
    </Pressable>
  );
}

export const uiStyles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  empty: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.7,
  },
});

const styles = StyleSheet.create({
  pageHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  pageHeadText: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  pageTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 24,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  cardCompact: {
    padding: spacing.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  ghost: {
    minHeight: 32,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    ...typography.small,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.65,
  },
});
