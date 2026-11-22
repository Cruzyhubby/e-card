import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';
import { Card, GhostButton, PageHead, SectionHead, uiStyles } from './ui';
import { formatClock, formatEventDate, initials, shortToken } from '../lib/format';
import { colors, radius, spacing, tones, typography } from '../theme';

const STATUS_LABEL = {
  valid: { text: 'Checked In', tone: 'success' },
  already_checked_in: { text: 'Duplicate', tone: 'warning' },
  denied: { text: 'Denied', tone: 'danger' },
};

function eventStatus(event) {
  if (!event || !event.event_date) return { text: 'Gate Shift', color: colors.textMuted };
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  if (event.event_date === todayKey) return { text: 'Active Event Shift', color: colors.success };
  if (event.event_date > todayKey) return { text: 'Scheduled Shift', color: colors.warning };
  return { text: 'Shift Ended', color: colors.textMuted };
}

export default function HomeTab({
  user,
  event,
  deviceId,
  gate,
  syncError,
  counts,
  onScan,
  onManual,
  onHistory,
  onRetry,
}) {
  const stats = (gate && gate.stats) || {};
  const expected = Number(stats.guests ?? event.guest_count ?? 0);
  const checked = Number(stats.checked_in ?? event.checked_in_count ?? 0);
  const remaining = Math.max(0, expected - checked);
  const pct = expected ? Math.min(100, Math.round((checked / expected) * 1000) / 10) : 0;
  const recent = (gate && gate.recent) || [];
  const status = eventStatus(event);
  const firstName = (user && user.name ? user.name.split(' ')[0] : 'Usher');
  const when = event.start_time
    ? `${formatEventDate(event.event_date)} · ${event.start_time}`
    : formatEventDate(event.event_date);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PageHead
        kicker={`${when} · Gate scanner`}
        title={`Welcome, ${firstName}`}
        right={<GhostButton label="History →" onPress={onHistory} />}
      />

      {!gate ? (
        <View style={styles.syncBanner}>
          <View style={styles.syncInfo}>
            <View style={[styles.syncDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.syncText}>
              {syncError
                ? 'Could not refresh event totals. Check the connection.'
                : 'Syncing event totals with the server…'}
            </Text>
          </View>
          {onRetry ? <GhostButton label="Retry" onPress={onRetry} /> : null}
        </View>
      ) : null}

      <Card>
        <View style={styles.eventHead}>
          <View style={styles.eventHeadMain}>
            <View style={styles.metaLine}>
              <Text style={[styles.metaStatus, { color: status.color }]}>{status.text}</Text>
              {event.category ? <Text style={styles.metaMuted}>· {event.category}</Text> : null}
            </View>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {event.title || 'Event'}
            </Text>
          </View>
          <View style={styles.gateLabel}>
            <Icon name="shield" size={15} color={colors.accent} />
            <Text style={styles.gateLabelText} numberOfLines={1}>
              {deviceId || 'Gate'}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Icon name="clock" size={13} color={colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>
              {when || 'Date to be confirmed'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Icon name="pin" size={13} color={colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>
              {event.venue || 'Venue to be confirmed'}
            </Text>
          </View>
        </View>

        <View style={uiStyles.divider} />

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Expected</Text>
            <Text style={styles.kpiValue}>{expected}</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Checked In</Text>
            <Text style={[styles.kpiValue, { color: colors.success }]}>{checked}</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Remaining</Text>
            <Text style={styles.kpiValue}>{remaining}</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Attendance</Text>
            <Text style={[styles.kpiValue, { color: colors.accent }]}>{pct.toFixed(1)}%</Text>
          </View>
        </View>

        <View style={styles.progressHead}>
          <Text style={styles.progressLabel}>Gate admission progress</Text>
          <Text style={styles.progressValue}>
            {checked} of {expected} guests
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>

        <View style={styles.briefing}>
          <Icon name="info" size={16} color={colors.accent} />
          <Text style={styles.briefingText} numberOfLines={4}>
            <Text style={styles.briefingStrong}>Gate briefing: </Text>
            {event.description ||
              'Verify each guest QR or pass code. Duplicate and invalid tickets are flagged automatically.'}
          </Text>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHead title="Quick Actions" right={<Text style={styles.mutedNote}>{deviceId || 'Gate'}</Text>} />
        <View style={styles.actionRow}>
          <Pressable
            onPress={onScan}
            style={({ pressed }) => [styles.actionTile, styles.actionPrimary, pressed && uiStyles.pressed]}
            accessibilityRole="button"
          >
            <View style={[styles.actionIcon, styles.actionIconPrimary]}>
              <Icon name="qr" size={20} color={colors.bg} />
            </View>
            <View>
              <Text style={[styles.actionTitle, styles.actionTitlePrimary]}>Scan Ticket</Text>
              <Text style={styles.actionSubPrimary}>Camera & QR check</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={onManual}
            style={({ pressed }) => [styles.actionTile, pressed && uiStyles.pressed]}
            accessibilityRole="button"
          >
            <View style={styles.actionIcon}>
              <Icon name="keyboard" size={19} color={colors.text} />
            </View>
            <View>
              <Text style={styles.actionTitle}>Manual Entry</Text>
              <Text style={styles.actionSub}>Type a pass code</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHead
          title="Your Shift"
          right={<Text style={styles.mutedNote}>{counts.valid + counts.duplicates + counts.denied} scans</Text>}
        />
        <View style={styles.chipRow}>
          <ShiftChip label="Valid" value={counts.valid} tone="success" />
          <ShiftChip label="Duplicate" value={counts.duplicates} tone="warning" />
          <ShiftChip label="Denied" value={counts.denied} tone="danger" />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHead
          title="Recent Check-Ins"
          right={<GhostButton label="View history →" onPress={onHistory} />}
        />
        <View style={uiStyles.listCard}>
          {recent.length ? (
            recent.slice(0, 5).map((item, index) => (
              <RecentRow key={`${item.id || index}`} item={item} last={index === Math.min(recent.length, 5) - 1} />
            ))
          ) : (
            <View style={uiStyles.empty}>
              <Text style={uiStyles.emptyText}>
                No check-ins recorded on this device yet. Head to Scan and point the camera at a guest QR.
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function ShiftChip({ label, value, tone }) {
  const palette = tones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.soft, borderColor: palette.border }]}>
      <Text style={[styles.chipValue, { color: palette.base }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

function RecentRow({ item, last }) {
  const meta = STATUS_LABEL[item.validation_status] || STATUS_LABEL.denied;
  const palette = tones[meta.tone];
  const name = item.guest_name || 'Unknown pass';
  const sub = [
    item.table_number !== null && item.table_number !== undefined ? `Table ${item.table_number}` : null,
    item.token_attempted ? shortToken(item.token_attempted) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.recentRow, last && styles.recentRowLast]}>
      <View style={[styles.recentAvatar, { backgroundColor: palette.soft, borderColor: palette.border }]}>
        <Text style={[styles.recentAvatarText, { color: palette.base }]}>
          {item.guest_name ? initials(item.guest_name) : '—'}
        </Text>
      </View>
      <View style={styles.recentMain}>
        <Text style={styles.recentTitle} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.recentSub} numberOfLines={1}>
          {sub || 'QR scan'}
        </Text>
      </View>
      <View style={styles.recentRight}>
        <Text style={[styles.recentStatus, { color: palette.base }]}>{meta.text}</Text>
        <Text style={styles.recentTime}>{formatClock(item.scanned_at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  syncText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  eventHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  eventHeadMain: {
    flex: 1,
    minWidth: 0,
  },
  metaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  metaStatus: {
    ...typography.small,
    fontSize: 12,
    fontWeight: '700',
  },
  metaMuted: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  eventTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 21,
    marginTop: 4,
  },
  gateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 2,
    flexShrink: 0,
    maxWidth: '42%',
  },
  gateLabelText: {
    ...typography.small,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: spacing.lg,
  },
  detailText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kpiCell: {
    width: '50%',
    paddingVertical: 6,
  },
  kpiLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  kpiValue: {
    ...typography.display,
    color: colors.text,
    fontSize: 24,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  progressValue: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.success,
  },
  briefing: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  briefingText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  briefingStrong: {
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginTop: spacing.xs,
  },
  mutedNote: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionTile: {
    flex: 1,
    minHeight: 112,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
  },
  actionPrimary: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accent,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconPrimary: {
    backgroundColor: 'rgba(8, 18, 14, 0.14)',
  },
  actionTitle: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  actionTitlePrimary: {
    color: colors.bg,
  },
  actionSub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  actionSubPrimary: {
    ...typography.small,
    color: 'rgba(8, 18, 14, 0.72)',
    fontSize: 11,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipValue: {
    ...typography.display,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    lineHeight: 24,
  },
  chipLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  recentRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentRowLast: {
    borderBottomWidth: 0,
  },
  recentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentAvatarText: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '800',
  },
  recentMain: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  recentSub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentStatus: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '800',
  },
  recentTime: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
