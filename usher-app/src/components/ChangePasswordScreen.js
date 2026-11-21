import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Field from './Field';
import Icon from './Icon';
import PrimaryButton from './PrimaryButton';
import { ApiError, createApi } from '../lib/api';
import { colors, radius, shadows, spacing, typography } from '../theme';

export default function ChangePasswordScreen({ baseUrl, token, name, onDone, onCancel, onSessionExpired }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const submit = useCallback(async () => {
    if (busy) return;

    if (!currentPassword) {
      setError('Enter the temporary password from your organizer.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for the new password.');
      return;
    }
    if (password !== confirmation) {
      setError('The new passwords do not match.');
      return;
    }
    if (password === currentPassword) {
      setError('Choose a password different from the temporary one.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const api = createApi({ baseUrl, token });
      const data = await api.changePassword(currentPassword, password, confirmation);
      if (alive.current) onDone(data.user);
    } catch (err) {
      if (!alive.current) return;
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        if (onSessionExpired) onSessionExpired();
        else setError(err.message || 'Your session has ended. Sign in again.');
        return;
      }
      setError(err && err.message ? err.message : 'Could not update the password.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [busy, baseUrl, token, currentPassword, password, confirmation, onDone, onSessionExpired]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wrap}>
            <View style={styles.brandLockup}>
              <View style={styles.brandMark}>
                <Icon name="qr" size={22} color={colors.white} />
              </View>
              <View>
                <Text style={styles.brandTitle}>Éclat Gate</Text>
                <Text style={styles.brandSubtitle}>Secure your usher account</Text>
              </View>
            </View>

            {error ? (
              <View style={[styles.banner, styles.bannerError]}>
                <Text style={styles.bannerErrorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Set a new password</Text>
              <Text style={styles.cardCopy}>
                {name ? `${name}, your` : 'Your'} account starts with the phone number digits as a temporary
                password. Choose your own password to open the scanner.
              </Text>

              <Field
                label="Temporary password"
                value={currentPassword}
                onChangeText={(value) => {
                  setCurrentPassword(value);
                  setError('');
                }}
                icon="lock"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                placeholder="Phone number digits"
              />
              <Field
                label="New password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError('');
                }}
                icon="lock"
                rightAction={{
                  label: showPassword ? 'Hide' : 'Show',
                  onPress: () => setShowPassword((value) => !value),
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                hint="At least 8 characters, and different from the temporary password."
              />
              <Field
                label="Confirm new password"
                value={confirmation}
                onChangeText={(value) => {
                  setConfirmation(value);
                  setError('');
                }}
                icon="lock"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                placeholder="Repeat the new password"
                style={styles.lastField}
              />

              <PrimaryButton
                label="Update password"
                onPress={submit}
                loading={busy}
                disabled={busy}
                style={styles.primary}
              />
            </View>

            <Pressable
              onPress={onCancel}
              hitSlop={10}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.backText}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 24,
    paddingBottom: spacing.xxxl,
  },
  wrap: {
    width: '100%',
    maxWidth: 420,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: 24,
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 22,
  },
  brandSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: spacing.lg,
  },
  bannerError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  bannerErrorText: {
    ...typography.small,
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  cardTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 21,
  },
  cardCopy: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  lastField: {
    marginBottom: 0,
  },
  primary: {
    marginTop: spacing.lg,
  },
  back: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backText: {
    ...typography.small,
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
