import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';
import { initials } from '../lib/format';
import { colors, spacing, typography } from '../theme';

export default function TopBar({ user, deviceId, online, onProfile }) {
  return (
    <View style={styles.bar}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Icon name="qr" size={16} color={colors.white} />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.title} numberOfLines={1}>
            Éclat Gate
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {deviceId || 'Usher scanner'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.status}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: online ? colors.success : colors.warning },
            ]}
          />
          <Text style={styles.statusText}>{online ? 'Live' : 'Syncing'}</Text>
        </View>
        <Pressable
          onPress={onProfile}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.avatarText}>{initials(user && user.name)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 54,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flexShrink: 1,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    minWidth: 0,
  },
  title: {
    ...typography.heading,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
    letterSpacing: 0.4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.small,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
