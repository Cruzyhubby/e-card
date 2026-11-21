import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';
import { colors, typography } from '../theme';

const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'scan', label: 'Scan', icon: 'scan' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

export default function BottomNav({ active, onChange }) {
  return (
    <View style={styles.nav}>
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Icon
              name={tab.icon}
              size={20}
              color={isActive ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    height: 62,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 44,
    borderRadius: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.accent,
  },
});
