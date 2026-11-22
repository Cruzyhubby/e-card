import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, PageHead, uiStyles } from './ui';
import Icon from './Icon';
import { formatEventDate, initials } from '../lib/format';
import { colors, radius, spacing, typography } from '../theme';

export default function ProfileTab({ user, event, deviceId, onChangePassword, onSignOut }) {
  const name = (user && user.name) || 'Gate usher';
  const email = (user && user.email) || '—';
  const when = event.start_time
    ? `${formatEventDate(event.event_date)} · ${event.start_time}`
    : formatEventDate(event.event_date);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <PageHead kicker="Usher account & device" title="Profile" />

      <Card>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.role} numberOfLines={1}>
              Gate usher · {deviceId || 'Scanner'}
            </Text>
          </View>
        </View>

        <View style={styles.kvList}>
          <Row label="Email" value={email} />
          <Row label="Phone" value={(user && user.phone) || '—'} />
          <Row label="Active event" value={event.title || '—'} />
          <Row label="Event date" value={when || '—'} />
          <Row label="Venue" value={event.venue || '—'} />
          <Row label="Account status" value="Active" valueColor={colors.success} />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onChangePassword}
            style={({ pressed }) => [styles.secondaryBtn, pressed && uiStyles.pressed]}
            accessibilityRole="button"
          >
            <Icon name="lock" size={15} color={colors.text} />
            <Text style={styles.secondaryLabel}>Change password</Text>
          </Pressable>
          <Pressable
            onPress={onSignOut}
            style={({ pressed }) => [styles.dangerBtn, pressed && uiStyles.pressed]}
            accessibilityRole="button"
          >
            <Icon name="door" size={15} color={colors.white} />
            <Text style={styles.dangerLabel}>Log out</Text>
          </Pressable>
        </View>
      </Card>

      <Card style={styles.secondCard}>
        <Text style={styles.cardTitle}>Session & security</Text>
        <Text style={styles.cardCopy}>
          This scanner is locked to one event. Every check-in is validated by the Fahari server before a guest is
          admitted.
        </Text>
        <View style={styles.kvList}>
          <Row label="Connection" value="Connected" valueColor={colors.success} />
          <Row label="Session storage" value="Encrypted on this device" />
          <Row label="Access" value="Event-scoped usher pass" />
        </View>
        <View style={styles.scopeNote}>
          <Icon name="shield" size={16} color={colors.accent} />
          <Text style={styles.scopeText}>
            Other events and organizer tools are not available from this device.
          </Text>
        </View>
      </Card>

      <Text style={styles.footnote}>Fahari Gate Scanner · signed in as {email}</Text>
    </ScrollView>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{label}</Text>
      <Text style={[styles.kvVal, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.title,
    color: colors.text,
    fontSize: 17,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.heading,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  role: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  kvList: {
    marginTop: 6,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kvKey: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 13,
    flexShrink: 0,
  },
  kvVal: {
    ...typography.small,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  secondaryLabel: {
    ...typography.small,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  dangerBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.dangerStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dangerLabel: {
    ...typography.small,
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  secondCard: {
    marginTop: spacing.lg,
  },
  cardTitle: {
    ...typography.heading,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cardCopy: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  scopeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
  },
  scopeText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  footnote: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
