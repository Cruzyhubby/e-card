import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import ChangePasswordScreen from './ChangePasswordScreen';
import Field from './Field';
import Icon from './Icon';
import PrimaryButton from './PrimaryButton';
import UsherProfileScreen from './UsherProfileScreen';
import {
  ApiError,
  DEFAULT_DEVICE_ID,
  candidateBaseUrls,
  createApi,
  discoverApi,
  normalizeBaseUrl,
  preferredBaseUrl,
} from '../lib/api';
import { formatEventDate, initials } from '../lib/format';
import { saveSession } from '../lib/storage';
import { colors, radius, shadows, spacing, typography } from '../theme';

function sessionFrom(initial) {
  return {
    baseUrl: preferredBaseUrl(initial && initial.baseUrl),
    deviceId: (initial && initial.deviceId) || DEFAULT_DEVICE_ID,
    token: (initial && initial.token) || '',
    user: (initial && initial.user) || null,
    event: (initial && initial.event) || null,
  };
}

function offlineMessage(baseUrl) {
  if (!__DEV__) {
    return 'No connection to the gate server. Check that you are on the venue Wi-Fi, then tap RETRY.';
  }
  const tried = candidateBaseUrls(baseUrl)
    .map((url) => url.replace(/^https?:\/\//, ''))
    .join(', ');
  return tried
    ? `No connection to the gate server. Tried ${tried}. Check Wi-Fi, then tap RETRY.`
    : 'No connection to the gate server. Check Wi-Fi, then tap RETRY.';
}

export default function SetupScreen({ initial, notice, onStart, onSignOut, onSessionExpired }) {
  const restored = useRef(sessionFrom(initial)).current;
  const [baseUrl, setBaseUrl] = useState(restored.baseUrl);
  const [deviceId, setDeviceId] = useState(restored.deviceId);
  const [token, setToken] = useState(restored.token);
  const [user, setUser] = useState(restored.user);
  const [event, setEvent] = useState(restored.event);
  const [email, setEmail] = useState((initial && initial.email) || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(null);
  const [pendingProfile, setPendingProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [connection, setConnection] = useState(null);
  const [error, setError] = useState('');

  const alive = useRef(true);
  const verifyAttempted = useRef(false);
  const autoTested = useRef(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (error || (connection && !connection.ok)) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [error, connection]);

  useEffect(() => {
    if (autoTested.current) return;
    autoTested.current = true;
    if (restored.token) return;

    setDiscovering(true);
    discoverApi({ saved: restored.baseUrl })
      .then((found) => {
        if (!alive.current) return;
        if (found) {
          setBaseUrl(found.baseUrl);
          setConnection({ ok: true, message: 'Connected' });
        } else {
          setConnection({ ok: false, message: offlineMessage(restored.baseUrl) });
        }
      })
      .catch(() => {
        if (alive.current) {
          setConnection({ ok: false, message: offlineMessage(restored.baseUrl) });
        }
      })
      .finally(() => {
        if (alive.current) setDiscovering(false);
      });
  }, [restored.baseUrl, restored.token]);

  const verifySession = useCallback(
    async (rawToken, root, { restoredSession = false } = {}) => {
      const cleanToken = String(rawToken || '').trim();
      if (!cleanToken) return null;

      setChecking(true);
      try {
        const api = createApi({ baseUrl: root, token: cleanToken });
        const data = await api.me();
        if (!alive.current) return null;

        if (!data.user || data.user.role !== 'usher') {
          setError('This saved session is not a gate scanner account. Sign in with your usher email.');
          return null;
        }
        if (!data.event) {
          setError('Your account is not assigned to an event. Ask your organizer.');
          return null;
        }

        setBaseUrl(root);

        if (data.user.must_change_password) {
          setPending({ token: cleanToken, user: data.user, event: data.event });
          return null;
        }

        setToken(cleanToken);
        setUser(data.user);
        setEvent(data.event);
        setError('');
        return data;
      } catch (err) {
        if (!alive.current) return null;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setToken('');
          setUser(null);
          setEvent(null);
          if (restoredSession && onSessionExpired) {
            onSessionExpired();
          } else {
            setError(err.message || 'This account cannot be used right now.');
          }
          return null;
        }
        if (err instanceof ApiError && err.status === 0) {
          const found = await discoverApi({ saved: root });
          if (found && found.baseUrl !== root) {
            if (alive.current) setBaseUrl(found.baseUrl);
            return verifySession(cleanToken, found.baseUrl, { restoredSession });
          }
          setConnection({ ok: false, message: offlineMessage(root) });
          setError(offlineMessage(root));
          return null;
        }
        setError(err && err.message ? err.message : 'Could not verify the account. Try again.');
        return null;
      } finally {
        if (alive.current) setChecking(false);
      }
    },
    [onSessionExpired]
  );

  useEffect(() => {
    if (verifyAttempted.current) return;
    verifyAttempted.current = true;
    if (!restored.token) return;
    const root = preferredBaseUrl(restored.baseUrl);
    verifySession(restored.token, root, { restoredSession: true });
  }, [restored.baseUrl, restored.token, verifySession]);

  const handleRetryConnection = useCallback(async () => {
    if (discovering || busy) return;

    setDiscovering(true);
    setError('');
    setConnection(null);

    try {
      const found = await discoverApi({ saved: baseUrl });
      if (!alive.current) return;
      if (found) {
        setBaseUrl(found.baseUrl);
        setConnection({ ok: true, message: 'Connected' });
      } else {
        setConnection({ ok: false, message: offlineMessage(baseUrl) });
      }
    } catch (err) {
      if (alive.current) {
        setConnection({ ok: false, message: offlineMessage(baseUrl) });
      }
    } finally {
      if (alive.current) setDiscovering(false);
    }
  }, [discovering, busy, baseUrl]);

  const handleSignIn = useCallback(async () => {
    if (busy || checking) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Enter the gate label from your organizer, or your e-mail.');
      return;
    }
    if (!password) {
      setError('Enter the gate password from your organizer.');
      return;
    }

    setBusy(true);
    setError('');
    setConnection(null);

    let root = preferredBaseUrl(baseUrl);

    try {
      let api = createApi({ baseUrl: root });

      try {
        await api.ping();
      } catch (networkError) {
        const found = await discoverApi({ saved: root });
        if (!found) {
          setConnection({ ok: false, message: offlineMessage(root) });
          setError(offlineMessage(root));
          return;
        }
        root = found.baseUrl;
        setBaseUrl(root);
        api = createApi({ baseUrl: root });
      }

      let auth;

      try {
        auth = await api.login(cleanEmail, password);
      } catch (loginError) {
        if (loginError instanceof ApiError && loginError.status === 401) {
          setError('Incorrect gate label or password.');
        } else if (loginError instanceof ApiError && loginError.status === 0) {
          setConnection({ ok: false, message: offlineMessage(root) });
          setError(offlineMessage(root));
        } else {
          setError(loginError && loginError.message ? loginError.message : 'Could not sign in.');
        }
        return;
      }

      if (!auth.user || auth.user.role !== 'usher') {
        setError('This is not a gate scanner account. Organizers and admins use the web console.');
        return;
      }

      const data = await api.me();

      if (!data.event) {
        setError('This account is not assigned to an event yet. Ask your organizer.');
        return;
      }

      setBaseUrl(root);
      setConnection({ ok: true, message: 'Connected' });
      setPassword('');
      setDeviceId((data.user && data.user.device_id) || DEFAULT_DEVICE_ID);

      // Every sign-in identifies the person operating this shared gate account
      // before the scanner opens.
      setPendingProfile({ token: auth.token, user: data.user, event: data.event });
    } catch (err) {
      if (alive.current) {
        if (err instanceof ApiError && err.status === 0) {
          setConnection({ ok: false, message: offlineMessage(root) });
          setError(offlineMessage(root));
        } else {
          setError(err && err.message ? err.message : 'Could not sign in. Try again.');
        }
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [busy, checking, baseUrl, email, password]);

  const handleSignOut = useCallback(async () => {
    try {
      if (token) {
        await createApi({ baseUrl, token }).logout();
      }
    } catch (err) {
      // Local sign-out continues even if the network call fails.
    }
    setToken('');
    setUser(null);
    setEvent(null);
    setEmail((user && user.email) || email);
    setPassword('');
    setError('');
    if (onSignOut) onSignOut();
  }, [baseUrl, token, user, email, onSignOut]);

  const handleStart = useCallback(async () => {
    if (!token || !event) return;

    let root;
    try {
      root = normalizeBaseUrl(baseUrl);
    } catch (err) {
      setError(err.message);
      return;
    }

    const next = {
      baseUrl: root,
      deviceId: (user && user.device_id) || deviceId.trim() || DEFAULT_DEVICE_ID,
      email: (user && user.email) || '',
      token,
      user,
      eventId: event.id,
      event,
    };

    const stored = await saveSession(next);

    if (!stored) {
      setError('Could not save your session securely on this device. Try signing in again.');
      return;
    }

    onStart(next);
  }, [token, event, baseUrl, deviceId, user, onStart]);

  const paired = Boolean(token && event);
  const canStart = Boolean(paired && !checking);

  if (pendingProfile) {
    return (
      <UsherProfileScreen
        baseUrl={baseUrl}
        token={pendingProfile.token}
        user={pendingProfile.user}
        onDone={(updatedUser) => {
          const next = pendingProfile;
          setPendingProfile(null);

          if (updatedUser && updatedUser.must_change_password) {
            setPending({ token: next.token, user: updatedUser, event: next.event });
            return;
          }

          setToken(next.token);
          setUser(updatedUser);
          setEvent(next.event);
        }}
        onSessionExpired={() => {
          setPendingProfile(null);
          if (onSessionExpired) onSessionExpired();
        }}
        onCancel={async () => {
          const next = pendingProfile;
          setPendingProfile(null);
          setPassword('');
          if (next && next.token) {
            try {
              await createApi({ baseUrl, token: next.token }).logout();
            } catch (err) {
              // The local sign-out continues even if the network call fails.
            }
          }
        }}
      />
    );
  }

  if (pending) {
    return (
      <ChangePasswordScreen
        baseUrl={baseUrl}
        token={pending.token}
        name={pending.user && pending.user.name}
        onDone={(updatedUser) => {
          setToken(pending.token);
          setUser(updatedUser);
          setEvent(pending.event);
          setPending(null);
          setError('');
        }}
        onCancel={() => {
          setPending(null);
          setError('Set a new password to use this account.');
        }}
        onSessionExpired={() => {
          setPending(null);
          if (onSessionExpired) onSessionExpired();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wrap}>
            <View style={styles.brandLockup}>
              <View style={styles.brandMark}>
                <Icon name="qr" size={22} color={colors.white} />
              </View>
              <View>
                <Text style={styles.brandTitle}>Éclat Gate</Text>
                <Text style={styles.brandSubtitle}>Usher check-in & gate control</Text>
              </View>
            </View>

            {notice && !token ? (
              <View style={[styles.banner, styles.bannerInfo]}>
                <Text style={styles.bannerInfoText}>{notice}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={[styles.banner, styles.bannerError]}>
                <Text style={styles.bannerErrorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              {paired ? (
                <>
                  <Text style={styles.cardTitle}>Ready for your shift</Text>
                  <Text style={styles.cardCopy}>Your scanner is signed in and locked to this event.</Text>

                  <View style={styles.accountRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(user && user.name)}</Text>
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName} numberOfLines={1}>
                        {(user && user.name) || 'Gate scanner'}
                      </Text>
                      <Text style={styles.accountMeta} numberOfLines={1}>
                        {(user && user.email) || 'Usher account'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleSignOut}
                      hitSlop={10}
                      style={({ pressed }) => [styles.switch, pressed && styles.pressed]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.switchText}>Sign out</Text>
                    </Pressable>
                  </View>

                  <View style={styles.eventSummary}>
                    <Text style={styles.eventTitle} numberOfLines={3}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventMeta} numberOfLines={1}>
                      {event.start_time
                        ? `${formatEventDate(event.event_date)} · ${event.start_time}`
                        : formatEventDate(event.event_date)}
                    </Text>
                    <Text style={styles.eventVenue} numberOfLines={1}>
                      {event.venue || '—'}
                    </Text>
                    <Text style={styles.scopeNote}>
                      THIS ACCOUNT IS LOCKED TO THIS EVENT. OTHER EVENTS CANNOT BE SCANNED.
                    </Text>
                  </View>

                  <PrimaryButton
                    label="Start scanning"
                    onPress={handleStart}
                    disabled={!canStart}
                    style={styles.startButton}
                  />
                  <Text style={styles.footnote}>
                    Your account stays signed in on this device. Scan history is kept in memory only.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Sign in to your shift</Text>
                  <Text style={styles.cardCopy}>
                    Use the gate label and password from your organizer. Your own details come next.
                  </Text>

                  <Field
                    label="Gate label or e-mail"
                    icon="mail"
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      setError('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    placeholder="Gate A or you@example.com"
                  />
                  <Field
                    label="Gate password"
                    icon="lock"
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      setError('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    placeholder="Password from your organizer"
                    style={styles.lastField}
                    onSubmitEditing={handleSignIn}
                    returnKeyType="go"
                    rightAction={{
                      label: showPassword ? 'Hide' : 'Show',
                      onPress: () => setShowPassword((value) => !value),
                    }}
                  />

                  <PrimaryButton
                    label="Sign in"
                    onPress={handleSignIn}
                    loading={busy || checking}
                    disabled={busy || checking}
                    style={styles.primary}
                  />

                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        connection
                          ? connection.ok
                            ? styles.statusDotOk
                            : styles.statusDotBad
                          : styles.statusDotIdle,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        connection && !connection.ok && styles.statusTextBad,
                      ]}
                      numberOfLines={2}
                    >
                      {discovering
                        ? 'Finding your gate server…'
                        : connection
                          ? connection.ok
                            ? 'Connected to gate server'
                            : 'No connection to gate server'
                          : 'Starting…'}
                    </Text>
                    {discovering || !connection || !connection.ok ? (
                      <Pressable
                        onPress={handleRetryConnection}
                        disabled={discovering || busy}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityState={{ busy: discovering }}
                      >
                        {discovering ? (
                          <ActivityIndicator size="small" color={colors.textMuted} />
                        ) : (
                          <Text style={styles.statusAction}>Retry</Text>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                  {connection && !connection.ok && !error ? (
                    <Text style={styles.statusMessage}>{connection.message}</Text>
                  ) : null}

                  {checking ? (
                    <View style={styles.verifyRow}>
                      <ActivityIndicator color={colors.accent} />
                      <Text style={styles.verifyText}>Restoring your session…</Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            {!paired ? (
              <Text style={styles.footnote}>
                Gate accounts are created by your event organizer in Event Studio → Gate &amp; ushers.
                After signing in, add your full names, phone number and e-mail so scans are traceable
                to you.
              </Text>
            ) : null}
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
    paddingHorizontal: 16,
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
  bannerInfo: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  bannerInfoText: {
    ...typography.small,
    color: colors.accentText,
    fontSize: 13,
    lineHeight: 19,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusDotOk: {
    backgroundColor: colors.success,
  },
  statusDotBad: {
    backgroundColor: colors.danger,
  },
  statusDotIdle: {
    backgroundColor: colors.textDim,
  },
  statusText: {
    flex: 1,
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  statusTextBad: {
    color: '#FCA5A5',
  },
  statusAction: {
    ...typography.small,
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: spacing.md,
  },
  statusMessage: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.small,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    ...typography.heading,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  accountMeta: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  switch: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    ...typography.small,
    color: colors.accentText,
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  eventSummary: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  eventTitle: {
    ...typography.heading,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  eventMeta: {
    ...typography.small,
    color: colors.accentText,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  eventVenue: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  scopeNote: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.7,
    lineHeight: 15,
    marginTop: spacing.md,
  },
  startButton: {
    marginTop: spacing.xl,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  verifyText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
  footnote: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});

