import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Field from './Field';
import Icon from './Icon';
import { GhostButton, PageHead, uiStyles } from './ui';
import { ApiError } from '../lib/api';
import { formatDateTimeShort } from '../lib/format';
import { playFeedback } from '../lib/feedback';
import { colors, radius, spacing, tones, typography } from '../theme';

const OUTCOMES = [
  { value: 'confirmed', label: 'Confirmed', tone: 'success' },
  { value: 'not_confirmed', label: 'Not coming', tone: 'danger' },
  { value: 'no_answer', label: 'No answer', tone: 'warning' },
  { value: 'busy', label: 'Line busy', tone: 'warning' },
  { value: 'phone_off', label: 'Phone off', tone: 'warning' },
  { value: 'wrong_number', label: 'Wrong number', tone: 'danger' },
  { value: 'call_back_later', label: 'Call back later', tone: 'accent' },
];

const FILTERS = [
  { id: 'pending', label: 'To call' },
  { id: 'follow_up', label: 'Follow-ups' },
  { id: 'done', label: 'Completed' },
  { id: 'all', label: 'All' },
];

const CARD_LABELS = { single: 'Single', double: 'Double', group: 'Group', vip: 'VIP' };

const outcomeFor = (value) => OUTCOMES.find((outcome) => outcome.value === value) || null;

const pad = (value) => String(value).padStart(2, '0');

const followUpDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(1, days || 1));
  date.setHours(10, 0, 0, 0);
  return date;
};

const apiDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;

const followUpLabel = (days) => {
  const at = formatDateTimeShort(followUpDate(days).toISOString());
  if (days === 1) return `Tomorrow · ${at}`;
  if (days === 7) return `Next week · ${at}`;
  return `In ${days} days · ${at}`;
};

const digitsFor = (phone) => String(phone || '').replace(/[^\d+]/g, '');

function StatTile({ label, value, hint, tone }) {
  const palette = tones[tone] || tones.slate;
  return (
    <View style={[styles.tile, { borderColor: palette.border, backgroundColor: palette.soft }]}>
      <Text style={[styles.tileValue, { color: palette.base }]}>{value}</Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={styles.tileHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export default function CallingTab({ api, event, onSessionExpired }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const [flash, setFlash] = useState('');
  const [sheet, setSheet] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpChoice, setFollowUpChoice] = useState(2);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState('');

  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(
    async ({ silent = false, pull = false } = {}) => {
      if (!silent) setLoading(true);
      if (pull) setRefreshing(true);
      try {
        const payload = await api.callingMine();
        if (!alive.current) return;
        setData(payload);
        setError('');
      } catch (loadError) {
        if (!alive.current) return;
        if (loadError instanceof ApiError && loadError.status === 401) {
          onSessionExpired();
          return;
        }
        setError(
          loadError instanceof ApiError && loadError.status === 403
            ? 'Calling operations are not enabled for this gate. Ask the organizer to enable calling for your account.'
            : (loadError && loadError.message) || 'Could not load your calling queue.'
        );
      } finally {
        if (alive.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [api, onSessionExpired]
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load({ silent: true }), 60000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(''), 5000);
    return () => clearTimeout(timer);
  }, [flash]);

  const stats = data?.stats || {
    assigned: 0,
    called: 0,
    confirmed: 0,
    unresponsive: 0,
    pending: 0,
    follow_ups_due: 0,
    completion: 0,
  };
  const allocations = data?.allocations || [];
  const defaultDays = Math.max(1, Number(data?.follow_up_days) || 2);
  const followUpOptions = useMemo(
    () => Array.from(new Set([1, defaultDays, 3, 7])).sort((a, b) => a - b),
    [defaultDays]
  );

  const counts = useMemo(() => {
    const tally = { pending: 0, follow_up: 0, done: 0, all: allocations.length };
    allocations.forEach((allocation) => {
      if (allocation.status === 'completed') tally.done += 1;
      else if (allocation.follow_up_at) tally.follow_up += 1;
      else tally.pending += 1;
    });
    return tally;
  }, [allocations]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allocations.filter((allocation) => {
      if (filter === 'pending' && (allocation.status === 'completed' || allocation.follow_up_at)) return false;
      if (filter === 'follow_up' && !(allocation.status !== 'completed' && allocation.follow_up_at)) return false;
      if (filter === 'done' && allocation.status !== 'completed') return false;
      if (!needle) return true;
      const guest = allocation.guest || {};
      return [guest.name, guest.phone, guest.table_number, guest.card_type]
        .filter((value) => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [allocations, filter, query]);

  const callGuest = useCallback((phone) => {
    const number = digitsFor(phone);
    if (!number) return;
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Cannot place the call', 'This device could not open the phone dialer.');
    });
  }, []);

  const openSheet = useCallback(
    (allocation) => {
      setSheet(allocation);
      setOutcome('');
      setNotes('');
      setFollowUpChoice(defaultDays);
      setSheetError('');
    },
    [defaultDays]
  );

  const closeSheet = useCallback(() => {
    if (saving) return;
    setSheet(null);
    setSheetError('');
  }, [saving]);

  const saveOutcome = useCallback(async () => {
    if (!sheet) return;
    if (!outcome) {
      setSheetError('Choose the call outcome.');
      return;
    }

    setSaving(true);
    setSheetError('');
    try {
      const payload = { outcome, notes: notes.trim() || null };
      if (outcome === 'call_back_later') {
        payload.follow_up_at = apiDate(followUpDate(followUpChoice));
      }
      await api.recordCallAttempt(sheet.id, payload);
      const label = outcomeFor(outcome)?.label || outcome;
      playFeedback(outcome === 'confirmed' ? 'success' : outcome === 'not_confirmed' ? 'error' : 'warning');
      setFlash(`${sheet.guest?.name || 'Guest'} · ${label}`);
      setSheet(null);
      await load({ silent: true });
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.status === 401) {
        onSessionExpired();
        return;
      }
      setSheetError((saveError && saveError.message) || 'Could not save this call outcome.');
    } finally {
      if (alive.current) setSaving(false);
    }
  }, [api, sheet, outcome, notes, followUpChoice, load, onSessionExpired]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Loading your calling queue…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Icon name="phone" size={28} color={colors.textMuted} />
        <Text style={[styles.centerText, styles.centerTitle]}>Calling unavailable</Text>
        <Text style={styles.centerText}>{error}</Text>
        <GhostButton label="Try again" onPress={() => load()} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ pull: true })}
            tintColor={colors.accentText}
          />
        }
      >
        <PageHead
          kicker={event?.title || 'Calling'}
          title="Calling Queue"
          right={<GhostButton label="Refresh" onPress={() => load({ silent: true })} />}
        />

        {flash ? (
          <View style={styles.flash}>
            <Icon name="phone" size={14} color={colors.success} />
            <Text style={styles.flashText}>{flash}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        <View style={styles.tileGrid}>
          <StatTile label="Assigned" value={stats.assigned} tone="accent" />
          <StatTile label="Called" value={stats.called} tone="slate" />
          <StatTile label="Confirmed" value={stats.confirmed} tone="success" />
          <StatTile label="Follow-ups due" value={stats.follow_ups_due} tone={stats.follow_ups_due ? 'danger' : 'slate'} />
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHead}>
            <Text style={styles.progressLabel}>
              {stats.called} of {stats.assigned} called · {stats.completion}% complete
            </Text>
            <Text style={styles.progressMeta}>
              Pending {stats.pending} · Unresponsive {stats.unresponsive}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, stats.completion)}%` }]} />
          </View>
        </View>

        <Field
          icon="search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search guest, phone or table…"
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
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={[styles.filterCount, active && styles.filterCountActive]}>{counts[item.id]}</Text>
              </Pressable>
            );
          })}
        </View>

        {rows.length ? (
          rows.map((allocation) => {
            const guest = allocation.guest || {};
            const overdue = Boolean(allocation.overdue);
            const done = allocation.status === 'completed';
            const outcomeBadge = allocation.last_outcome ? outcomeFor(allocation.last_outcome) : null;

            return (
              <View key={allocation.id} style={[styles.card, overdue && styles.cardOverdue]}>
                <View style={styles.cardHead}>
                  <Text style={styles.guestName} numberOfLines={1}>
                    {guest.name || 'Guest'}
                  </Text>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {CARD_LABELS[guest.card_type] || guest.card_type || 'Single'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  Table {guest.table_number ?? '—'} · {guest.attendees_count || 1} attendee(s)
                </Text>
                <Text style={styles.cardPhone}>{guest.phone || 'No phone on file'}</Text>

                <View style={styles.badges}>
                  {outcomeBadge ? (
                    <View
                      style={[
                        styles.badge,
                        {
                          borderColor: tones[outcomeBadge.tone].border,
                          backgroundColor: tones[outcomeBadge.tone].soft,
                        },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: tones[outcomeBadge.tone].base }]}>
                        {allocation.last_outcome_label || outcomeBadge.label}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Not called</Text>
                    </View>
                  )}
                  {allocation.follow_up_at ? (
                    <View style={[styles.badge, overdue ? styles.badgeDanger : styles.badgeAccent]}>
                      <Text style={[styles.badgeText, overdue ? styles.badgeDangerText : styles.badgeAccentText]}>
                        {overdue ? 'Overdue' : 'Follow-up'} · {formatDateTimeShort(allocation.follow_up_at)}
                      </Text>
                    </View>
                  ) : null}
                  {done ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{allocation.attempts_count} attempt(s)</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardActions}>
                  {guest.phone ? (
                    <Pressable
                      onPress={() => callGuest(guest.phone)}
                      style={({ pressed }) => [styles.callBtn, pressed && uiStyles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${guest.name || 'guest'}`}
                    >
                      <Icon name="phone" size={14} color={colors.accentText} />
                      <Text style={styles.callBtnText}>Call</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => openSheet(allocation)}
                    style={({ pressed }) => [styles.logBtn, pressed && uiStyles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Log outcome for ${guest.name || 'guest'}`}
                  >
                    <Text style={styles.logBtnText}>{done ? 'Log another' : 'Log outcome'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          <View style={uiStyles.listCard}>
            <View style={uiStyles.empty}>
              <Text style={uiStyles.emptyText}>
                {allocations.length
                  ? 'No guests match this search or filter.'
                  : 'No guests are assigned to you yet. The organizer allocates guests from Calling operations.'}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.footnote}>
          Guests stay assigned to you after each call. Confirmed and Not coming update the guest list immediately.
        </Text>
      </ScrollView>

      <Modal visible={Boolean(sheet)} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropFill} onPress={closeSheet} accessibilityRole="button" />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sheetKicker}>Log call outcome</Text>
              <Text style={styles.sheetTitle}>{sheet?.guest?.name || 'Guest'}</Text>
              <Text style={styles.sheetMeta}>
                {CARD_LABELS[sheet?.guest?.card_type] || sheet?.guest?.card_type || 'Single'} · Table{' '}
                {sheet?.guest?.table_number ?? '—'} · {sheet?.guest?.attendees_count || 1} attendee(s)
              </Text>

              {sheet?.guest?.phone ? (
                <Pressable
                  onPress={() => callGuest(sheet.guest.phone)}
                  style={({ pressed }) => [styles.sheetPhone, pressed && uiStyles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${sheet.guest.phone}`}
                >
                  <Icon name="phone" size={16} color={colors.accentText} />
                  <Text style={styles.sheetPhoneText}>{sheet.guest.phone}</Text>
                </Pressable>
              ) : null}

              {sheet?.history?.length ? (
                <View style={styles.history}>
                  <Text style={styles.historyTitle}>Previous attempts</Text>
                  {sheet.history.map((entry) => (
                    <View key={entry.id} style={styles.historyRow}>
                      <Text style={styles.historyOutcome}>{entry.outcome_label}</Text>
                      <Text style={styles.historyWhen}>
                        {entry.user ? `${entry.user} · ` : ''}
                        {formatDateTimeShort(entry.at)}
                      </Text>
                      {entry.notes ? <Text style={styles.historyNotes}>{entry.notes}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={styles.sheetLabel}>Outcome</Text>
              <View style={styles.outcomeGrid}>
                {OUTCOMES.map((item) => {
                  const active = outcome === item.value;
                  const palette = tones[item.tone] || tones.slate;
                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => {
                        setOutcome(item.value);
                        setSheetError('');
                      }}
                      style={({ pressed }) => [
                        styles.outcomeBtn,
                        active && { borderColor: palette.border, backgroundColor: palette.soft },
                        pressed && uiStyles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.outcomeText, active && { color: palette.base }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {outcome === 'call_back_later' ? (
                <View style={styles.followUps}>
                  <Text style={styles.sheetLabel}>Call back at</Text>
                  {followUpOptions.map((days) => {
                    const active = followUpChoice === days;
                    return (
                      <Pressable
                        key={days}
                        onPress={() => setFollowUpChoice(days)}
                        style={({ pressed }) => [
                          styles.followUpBtn,
                          active && styles.followUpBtnActive,
                          pressed && uiStyles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.followUpText, active && styles.followUpTextActive]}>
                          {followUpLabel(days)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <Text style={styles.sheetLabel}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything the team should know about this call…"
                placeholderTextColor={colors.textDim}
                selectionColor={colors.accent}
                multiline
                maxLength={2000}
                style={styles.notes}
              />

              {sheetError ? <Text style={styles.sheetError}>{sheetError}</Text> : null}

              <View style={styles.sheetActions}>
                <Pressable
                  onPress={closeSheet}
                  disabled={saving}
                  style={({ pressed }) => [styles.sheetCancel, pressed && uiStyles.pressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveOutcome}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.sheetSave,
                    saving && styles.sheetSaveBusy,
                    pressed && uiStyles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.sheetSaveText}>{saving ? 'Saving…' : 'Save outcome'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  centerTitle: {
    ...typography.heading,
    color: colors.text,
  },
  centerText: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  flash: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tones.success.border,
    backgroundColor: tones.success.soft,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  flashText: {
    ...typography.small,
    color: tones.success.base,
    fontSize: 12,
    fontWeight: '700',
  },
  inlineError: {
    ...typography.small,
    color: colors.warning,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  tileValue: {
    ...typography.display,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  tileHint: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  progressCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  progressMeta: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  searchField: {
    marginBottom: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  filter: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  filterLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
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
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardOverdue: {
    borderColor: tones.danger.border,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  guestName: {
    ...typography.heading,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  cardMeta: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  cardPhone: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeAccent: {
    borderColor: tones.accent.border,
    backgroundColor: tones.accent.soft,
  },
  badgeAccentText: {
    color: tones.accent.base,
  },
  badgeDanger: {
    borderColor: tones.danger.border,
    backgroundColor: tones.danger.soft,
  },
  badgeDangerText: {
    color: tones.danger.base,
  },
  badgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: 12,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tones.accent.border,
    backgroundColor: tones.accent.soft,
    paddingHorizontal: spacing.lg,
  },
  callBtnText: {
    ...typography.small,
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '700',
  },
  logBtn: {
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: {
    ...typography.small,
    color: colors.bg,
    fontSize: 12,
    fontWeight: '800',
  },
  footnote: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 15,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    flex: 1,
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: 8,
    marginBottom: 2,
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sheetKicker: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sheetTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 21,
    marginTop: 2,
  },
  sheetMeta: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sheetPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tones.accent.border,
    backgroundColor: tones.accent.soft,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sheetPhoneText: {
    ...typography.small,
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '700',
  },
  history: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  historyTitle: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  historyRow: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyOutcome: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  historyWhen: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  historyNotes: {
    ...typography.small,
    color: colors.textDim,
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  sheetLabel: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.lg,
    marginBottom: 8,
  },
  outcomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  outcomeBtn: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  outcomeText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  followUps: {
    marginTop: 2,
  },
  followUpBtn: {
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: 6,
  },
  followUpBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  followUpText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  followUpTextActive: {
    color: colors.accentText,
    fontWeight: '700',
  },
  notes: {
    minHeight: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    textAlignVertical: 'top',
    ...typography.body,
    fontSize: 13,
  },
  sheetError: {
    ...typography.small,
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.md,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  sheetCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  sheetSave: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSaveBusy: {
    opacity: 0.7,
  },
  sheetSaveText: {
    ...typography.small,
    color: colors.bg,
    fontSize: 13,
    fontWeight: '800',
  },
});
