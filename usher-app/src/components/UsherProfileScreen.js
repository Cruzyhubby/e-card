import React, { useCallback, useRef, useState } from 'react';
import {
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

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function UsherProfileScreen({ baseUrl, token, user, onDone, onCancel, onSessionExpired }) {
  const gateLabel = (user && (user.device_label || user.device_id)) || 'this gate';

  // The gate account is shared, so each person starts with a blank form:
  // details saved by a previous shift must not carry over.
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
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

    const cleanName = name.trim().replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (cleanName.split(' ').filter(Boolean).length < 3) {
      setError('Enter your full name — first, middle and last names.');
      return;
    }
    if (!cleanPhone) {
      setError('Enter your phone number.');
      return;
    }
    if (!looksLikeEmail(cleanEmail)) {
      setError('Enter a valid e-mail address.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const api = createApi({ baseUrl, token });
      const data = await api.updateProfile({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
      });
      if (alive.current) onDone(data.user);
    } catch (err) {
      if (!alive.current) return;
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        if (onSessionExpired) onSessionExpired();
        else setError(err.message || 'Your session has ended. Sign in again.');
        return;
      }
      setError(err && err.message ? err.message : 'Could not save your details.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [busy, baseUrl, token, name, phone, email, onDone, onSessionExpired]);

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
                <Icon name="user" size={22} color={colors.white} />
              </View>
              <View>
                <Text style={styles.brandTitle}>Éclat Gate</Text>
                <Text style={styles.brandSubtitle}>Your details for this gate</Text>
              </View>
            </View>

            {error ? (
              <View style={[styles.banner, styles.bannerError]}>
                <Text style={styles.bannerErrorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Who is scanning?</Text>
              <Text style={styles.cardCopy}>
                You signed in to the shared gate account "{gateLabel}". Enter your own full names, phone
                number and e-mail before you start scanning.
              </Text>

              <Field
                label="Full names (first, middle, last)"
                icon="user"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setError('');
                }}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="name"
                placeholder="Amina Wanjiku Otieno"
                autoFocus
              />
              <Field
                label="Phone number"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  setError('');
                }}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="+254 712 345 678"
              />
              <Field
                label="E-mail address"
                icon="mail"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
                style={styles.lastField}
                onSubmitEditing={submit}
                returnKeyType="go"
              />

              <PrimaryButton
                label="Continue"
                onPress={submit}
                loading={busy}
                disabled={busy}
                style={styles.primary}
              />
            </View>

            <Text style={styles.footnote}>
              These details identify you in the gate log. The gate label and password stay the same for
              everyone assigned to this gate.
            </Text>

            <Pressable
              onPress={onCancel}
              hitSlop={10}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.backText}>Use a different gate account</Text>
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
  footnote: {
    ...typography.small,
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  back: {
    alignSelf: 'center',
    marginTop: spacing.md,
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
