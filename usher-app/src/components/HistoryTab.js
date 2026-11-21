import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Field from './Field';
import ScanRow from './ScanRow';
import { GhostButton, PageHead, uiStyles } from './ui';
import { SCAN_STATUS } from '../lib/scan';
import { colors, radius, spacing, typography } from '../theme';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'valid', label: 'Valid', status: SCAN_STATUS.VALID },
  { id: 'duplicate', label: 'Duplicate', status: SCAN_STATUS.ALREADY },
  { id: 'denied', label: 'Denied', status: SCAN_STATUS.DENIED },
];

export default function HistoryTab({ scans, onClear }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    return scans.reduce(
      (acc, scan) => {
        if (scan.status === SCAN_STATUS.VALID) acc.valid += 1;
        else if (scan.status === SCAN_STATUS.ALREADY) acc.duplicate += 1;
        else if (scan.status === SCAN_STATUS.DENIED) acc.denied += 1;
        return acc;
      },
      { valid: 0, duplicate: 0, denied: 0 }
    );
  }, [scans]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const active = FILTERS.find((item) => item.id === filter);
    return scans.filter((scan) => {
      if (active && active.status && scan.status !== active.status) return false;
      if (!needle) return true;
      const haystack = [scan.name, scan.token, scan.message, scan.table]
        .filter((value) => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [scans, filter, query]);

  const totalFor = (id) => {
    if (id === 'valid') return counts.valid;
    if (id === 'duplicate') return counts.duplicate;
    if (id === 'denied') return counts.denied;
    return scans.length;
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <PageHead
        kicker="This device · kept in memory"
        title="Check-In History"
        right={
          scans.length ? <GhostButton label="Clear" tone="danger" onPress={onClear} /> : null
        }
      />

      <Field
        icon="search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search guest name, ticket #, table…"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchField}
      />

      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setFilter(item.id)}
              style={({ pressed }) => [
                styles.filter,
                active && styles.filterActive,
                pressed && uiStyles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {item.label}
              </Text>
              <Text style={[styles.filterCount, active && styles.filterCountActive]}>
                {totalFor(item.id)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={uiStyles.listCard}>
        {rows.length ? (
          rows.map((scan, index) => (
            <ScanRow key={scan.id} scan={scan} last={index === rows.length - 1} />
          ))
        ) : (
          <View style={uiStyles.empty}>
            <Text style={uiStyles.emptyText}>
              {scans.length
                ? 'No scans match this search or filter.'
                : 'No scans in this session yet. Head to the Scan tab to check in guests.'}
            </Text>
            {scans.length && (filter !== 'all' || query) ? (
              <Pressable
                onPress={() => {
                  setFilter('all');
                  setQuery('');
                }}
                style={({ pressed }) => [styles.reset, pressed && uiStyles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.resetText}>Reset filters</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <Text style={styles.footnote}>
        Valid, duplicate, and denied attempts recorded on this device during this session.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  searchField: {
    marginBottom: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filter: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  filterLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  filterLabelActive: {
    color: colors.accentText,
  },
  filterCount: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  filterCountActive: {
    color: colors.accent,
  },
  reset: {
    marginTop: spacing.md,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    ...typography.small,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  footnote: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
