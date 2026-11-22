import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';

import Icon from './Icon';
import { colors, radius, spacing, typography } from '../theme';

const SCANNER_SETTINGS = { barcodeTypes: ['qr'] };
const RETICLE = 176;

export default function CameraStage({
  permission,
  torch,
  facing = 'back',
  busy,
  paused,
  onBarcodeScanned,
  onToggleTorch,
  onFlip,
  onRequestPermission,
  onOpenSettings,
}) {
  if (!permission) {
    return (
      <View style={[styles.box, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.centeredText}>Preparing camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.box, styles.centered]}>
        <View style={styles.permissionBadge}>
          <Icon name="camera" size={26} color={colors.accentText} />
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionCopy} numberOfLines={3}>
          Fahari Gate scans guest QR codes with the camera. Video never leaves this device.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
          onPress={permission.canAskAgain ? onRequestPermission : onOpenSettings}
          accessibilityRole="button"
        >
          <Text style={styles.permissionButtonText}>
            {permission.canAskAgain ? 'Allow camera' : 'Open settings'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={SCANNER_SETTINGS}
        onBarcodeScanned={paused ? undefined : onBarcodeScanned}
      />

      <View pointerEvents="none" style={styles.reticleLayer}>
        <View style={styles.shade} />
        <View style={styles.middleRow}>
          <View style={styles.shade} />
          <View style={styles.reticle}>
            <View style={styles.reticleHint}>
              <Icon name="qr" size={26} color={colors.accent} />
              <Text style={styles.reticleText}>Align guest QR inside frame</Text>
            </View>
          </View>
          <View style={styles.shade} />
        </View>
        <View style={styles.shade} />
      </View>

      <View style={styles.toolBar}>
        <Pressable
          onPress={onToggleTorch}
          style={({ pressed }) => [styles.tool, torch && styles.toolLit, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
        >
          <Icon name="bolt" size={14} color={torch ? colors.bg : colors.white} />
          <Text style={[styles.toolText, torch && styles.toolTextLit]}>
            {torch ? 'Light on' : 'Flashlight'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onFlip}
          style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
        >
          <Icon name="camera" size={15} color={colors.white} />
          <Text style={styles.toolText}>{facing === 'back' ? 'Rear camera' : 'Front camera'}</Text>
        </Pressable>
      </View>

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.busyText}>Verifying…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 290,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: '#070C14',
    overflow: 'hidden',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  centeredText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  permissionBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  permissionTitle: {
    ...typography.heading,
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  permissionCopy: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  permissionButton: {
    minHeight: 42,
    minWidth: 170,
    borderRadius: radius.md,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  permissionButtonText: {
    ...typography.body,
    color: colors.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  reticleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  shade: {
    flex: 1,
    backgroundColor: colors.cameraShade,
  },
  middleRow: {
    flexDirection: 'row',
    height: RETICLE,
  },
  reticle: {
    width: RETICLE,
    height: RETICLE,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  reticleHint: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  reticleText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  toolBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tool: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(15, 23, 42, 0.84)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolLit: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  toolText: {
    ...typography.small,
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  toolTextLit: {
    color: colors.bg,
  },
  busy: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(6, 10, 19, 0.82)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  busyText: {
    ...typography.small,
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
});
