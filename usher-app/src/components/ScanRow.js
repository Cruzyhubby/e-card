import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatClock, initials, shortToken } from '../lib/format';
import { SCAN_STATUS, SCAN_STATUS_META } from '../lib/scan';
import { colors, tones, typography } from '../theme';

export default function ScanRow({ scan, last = false }) {
  const meta = SCAN_STATUS_META[scan.status] || SCAN_STATUS_META[SCAN_STATUS.ERROR];
  const palette = tones[meta.tone] || tones.slate;
  const title =
    scan.name ||
    (scan.status === SCAN_STATUS.DENIED ? 'Pass not recognised' : shortToken(scan.token));
  const sub = [
    scan.source === 'manual' ? 'Manual' : 'QR scan',
    scan.table !== null && scan.table !== undefined ? `Table ${scan.table}` : null,
    scan.message && !scan.name ? scan.message : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={[styles.avatar, { borderColor: palette.border, backgroundColor: palette.soft }]}>
        <Text style={[styles.avatarText, { color: palette.base }]}>
          {scan.name ? initials(scan.name) : meta.short}
        </Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub || shortToken(scan.token)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.status, { color: palette.base }]} numberOfLines={1}>
          {meta.label}
        </Text>
        <Text style={styles.time}>{formatClock(scan.scannedAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '800',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  status: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '800',
  },
  time: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
