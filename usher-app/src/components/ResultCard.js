import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';
import { formatClock, shortToken } from '../lib/format';
import { colors, radius, spacing, tones, typography } from '../theme';

const VARIANTS = {
  valid: { tone: 'success', kicker: 'Valid entry', icon: null },
  duplicate: { tone: 'warning', kicker: 'Already checked in', icon: null },
  denied: { tone: 'danger', kicker: 'Entry denied', icon: null },
  network: { tone: 'slate', kicker: 'No response', icon: 'info' },
  expired: { tone: 'slate', kicker: 'Session expired', icon: 'lock' },
};

const GLYPHS = {
  valid: '✓',
  duplicate: '!',
  denied: '✕',
};

export default function ResultCard({ result, onDismiss }) {
  if (!result) return null;

  const variant = VARIANTS[result.variant] || VARIANTS.denied;
  const palette = tones[variant.tone] || tones.slate;
  const title =
    result.name ||
    (result.variant === 'valid'
      ? 'Guest admitted'
      : result.variant === 'duplicate'
        ? 'Duplicate pass'
        : result.variant === 'denied'
          ? 'Pass not recognised'
          : 'Check the connection');

  const rows = [];
  if (result.table !== null && result.table !== undefined) {
    rows.push(['Table', String(result.table)]);
  }
  if (result.checkedInAt) {
    rows.push([result.variant === 'duplicate' ? 'First check-in' : 'Checked in', formatClock(result.checkedInAt)]);
  }
  if (result.token) {
    rows.push(['Code', shortToken(result.token)]);
  }

  return (
    <Pressable
      onPress={onDismiss}
      style={[
        styles.card,
        { backgroundColor: palette.soft, borderColor: palette.border },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${variant.kicker}. Tap to dismiss.`}
    >
      <View style={styles.head}>
        <View style={styles.iconBox}>
          {variant.icon ? (
            <Icon name={variant.icon} size={20} color={palette.base} />
          ) : (
            <Text style={[styles.glyph, { color: palette.base }]}>
              {GLYPHS[result.variant] || '!'}
            </Text>
          )}
        </View>
        <View style={styles.headText}>
          <Text style={[styles.kicker, { color: palette.base }]}>{variant.kicker}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {result.message ? (
            <Text style={styles.message} numberOfLines={3}>
              {result.message}
            </Text>
          ) : null}
        </View>
      </View>

      {rows.length ? (
        <View style={styles.details}>
          {rows.map(([key, value], index) => (
            <View
              key={key}
              style={[styles.kvRow, index === rows.length - 1 && styles.kvRowLast]}
            >
              <Text style={styles.kvKey}>{key}</Text>
              <Text style={styles.kvVal} numberOfLines={1}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    ...typography.micro,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    ...typography.heading,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  message: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  details: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kvRowLast: {
    borderBottomWidth: 0,
  },
  kvKey: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 13,
  },
  kvVal: {
    ...typography.small,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
