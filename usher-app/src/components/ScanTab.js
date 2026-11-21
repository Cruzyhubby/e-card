import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CameraStage from './CameraStage';
import Field from './Field';
import Icon from './Icon';
import PrimaryButton from './PrimaryButton';
import ResultCard from './ResultCard';
import ScanRow from './ScanRow';
import { Card, GhostButton, PageHead, SectionHead, uiStyles } from './ui';
import { colors, radius, spacing, typography } from '../theme';

export default function ScanTab({
  event,
  deviceId,
  permission,
  torch,
  facing,
  busy,
  paused,
  result,
  scans,
  mode,
  onChangeMode,
  onBarcodeScanned,
  onToggleTorch,
  onFlip,
  onRequestPermission,
  onOpenSettings,
  onManualVerify,
  onDismissResult,
  onHistory,
}) {
  const [code, setCode] = useState('');

  const submitManual = () => {
    const value = code.trim();
    if (!value || busy) return;
    setCode('');
    onManualVerify(value);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <PageHead
        kicker={`${event.title || 'Event'} · ${deviceId || 'Gate'}`}
        title="Scan Tickets"
      />

      <View style={styles.segmented}>
        <Pressable
          onPress={() => onChangeMode('camera')}
          style={({ pressed }) => [
            styles.segBtn,
            mode === 'camera' && styles.segBtnActive,
            pressed && uiStyles.pressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'camera' }}
        >
          <Icon name="scan" size={15} color={mode === 'camera' ? colors.accent : colors.textMuted} />
          <Text style={[styles.segLabel, mode === 'camera' && styles.segLabelActive]}>Camera</Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeMode('manual')}
          style={({ pressed }) => [
            styles.segBtn,
            mode === 'manual' && styles.segBtnActive,
            pressed && uiStyles.pressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'manual' }}
        >
          <Icon
            name="keyboard"
            size={15}
            color={mode === 'manual' ? colors.accent : colors.textMuted}
          />
          <Text style={[styles.segLabel, mode === 'manual' && styles.segLabelActive]}>Manual</Text>
        </Pressable>
      </View>

      {mode === 'camera' ? (
        <>
          <CameraStage
            permission={permission}
            torch={torch}
            facing={facing}
            busy={busy}
            paused={paused}
            onBarcodeScanned={onBarcodeScanned}
            onToggleTorch={onToggleTorch}
            onFlip={onFlip}
            onRequestPermission={onRequestPermission}
            onOpenSettings={onOpenSettings}
          />

          <View style={styles.btnRow}>
            <Pressable
              onPress={() => onChangeMode('manual')}
              style={({ pressed }) => [styles.secondaryBtn, pressed && uiStyles.pressed]}
              accessibilityRole="button"
            >
              <Icon name="keyboard" size={16} color={colors.text} />
              <Text style={styles.secondaryLabel}>Manual entry</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            {permission && permission.granted
              ? 'Hold the guest pass steady inside the frame. Valid, duplicate, and denied passes are recorded instantly.'
              : 'Allow camera access to scan guest passes, or switch to manual entry.'}
          </Text>
        </>
      ) : (
        <>
          <Card style={styles.manualCard}>
            <Text style={styles.cardTitle}>Verify by ticket number</Text>
            <Text style={styles.cardCopy}>
              Type the pass code printed on the invitation. The full /i/ link from an e-card is accepted too.
            </Text>
            <View style={styles.manualForm}>
              <Field
                label="Ticket number"
                value={code}
                onChangeText={setCode}
                placeholder="e.g. GP-1002"
                icon="qr"
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                editable={!busy}
                returnKeyType="go"
                onSubmitEditing={submitManual}
                style={styles.lastField}
              />
              <PrimaryButton
                label="Verify ticket"
                onPress={submitManual}
                loading={busy}
                disabled={busy || !code.trim()}
                style={styles.verifyButton}
              />
            </View>
          </Card>

          <Text style={styles.hint}>
            Manual checks use the same server validation as camera scans. Nothing is admitted twice.
          </Text>
        </>
      )}

      <ResultCard result={result} onDismiss={onDismissResult} />

      <View style={styles.sessionSection}>
        <SectionHead
          title="This session"
          right={<GhostButton label="Full history →" onPress={onHistory} />}
        />
        <View style={uiStyles.listCard}>
          {scans.length ? (
            scans
              .slice(0, 6)
              .map((scan, index) => (
                <ScanRow
                  key={scan.id}
                  scan={scan}
                  last={index === Math.min(scans.length, 6) - 1}
                />
              ))
          ) : (
            <View style={uiStyles.empty}>
              <Text style={uiStyles.emptyText}>
                No scans in this session yet. Point the camera at a guest QR or switch to manual entry.
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.footnote}>Newest first · held in memory, cleared when the app closes.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segBtnActive: {
    backgroundColor: colors.surface,
  },
  segLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  segLabelActive: {
    color: colors.text,
  },
  manualCard: {
    marginTop: spacing.lg,
  },
  cardTitle: {
    ...typography.heading,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cardCopy: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  manualForm: {
    marginTop: spacing.lg,
  },
  lastField: {
    marginBottom: 0,
  },
  verifyButton: {
    marginTop: spacing.md,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: 10,
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
    gap: 8,
  },
  secondaryLabel: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  sessionSection: {
    marginTop: spacing.xl,
  },
  footnote: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
