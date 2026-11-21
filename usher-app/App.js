import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import GateScreen from './src/components/GateScreen';
import SetupScreen from './src/components/SetupScreen';
import { createApi } from './src/lib/api';
import { clearSession, loadSession, saveSession } from './src/lib/storage';
import { colors, spacing, typography } from './src/theme';

function BootSplash() {
  return (
    <View style={styles.boot}>
      <View style={styles.bootBrandWrap}>
        <View style={styles.bootMark}>
          <Text style={styles.bootMarkText}>É</Text>
        </View>
        <Text style={styles.bootBrand}>ÉCLAT GATE</Text>
        <Text style={styles.bootSub}>USHER SCANNER</Text>
      </View>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

function GateApp() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadSession()
      .then((stored) => {
        if (cancelled) return;
        if (!stored) return;
        if (stored.user?.must_change_password) {
          // A saved session cannot scan until the first password change is completed.
          setSession({
            baseUrl: stored.baseUrl,
            deviceId: stored.deviceId,
            email: stored.email || '',
            token: null,
            user: null,
            eventId: null,
            event: null,
          });
          return;
        }
        setSession(stored);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(async (next) => {
    const value = { ...next, savedAt: new Date().toISOString() };
    setSession(value);
    setNotice('');
    await saveSession(value);
  }, []);

  const signOut = useCallback(async () => {
    if (session?.token) {
      try {
        await createApi({ baseUrl: session.baseUrl, token: session.token }).logout();
      } catch (error) {
        // Local sign-out continues even if the server cannot be reached.
      }
    }
    const config = session
      ? {
          baseUrl: session.baseUrl,
          deviceId: session.deviceId,
          email: session.email || (session.user && session.user.email) || '',
          token: null,
          user: null,
          eventId: null,
          event: null,
        }
      : null;
    setSession(config);
    setNotice('Signed out. The saved account was removed from this device.');
    if (config) await saveSession(config);
    else await clearSession();
  }, [session]);

  const expireSession = useCallback(async () => {
    const config = session
      ? {
          baseUrl: session.baseUrl,
          deviceId: session.deviceId,
          email: session.email || (session.user && session.user.email) || '',
          token: null,
          user: null,
          eventId: null,
          event: null,
        }
      : null;
    setSession(config);
    setNotice('Session expired or the account was suspended. Sign in again to continue.');
    if (config) await saveSession(config);
    else await clearSession();
  }, [session]);

  if (!ready) return <BootSplash />;

  const scanning = Boolean(session && session.token && session.event);

  return (
    <View style={styles.app}>
      {scanning ? (
        <GateScreen
          session={session}
          onSignOut={signOut}
          onSessionExpired={expireSession}
        />
      ) : (
        <SetupScreen
          initial={session}
          notice={notice}
          onStart={startSession}
          onSignOut={signOut}
          onSessionExpired={expireSession}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <GateApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingBottom: spacing.xxxl,
  },
  bootBrandWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  bootMark: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  bootMarkText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 34,
  },
  bootBrand: {
    ...typography.display,
    color: colors.text,
    letterSpacing: 2,
    fontSize: 26,
  },
  bootSub: {
    ...typography.label,
    color: colors.accentText,
    marginTop: spacing.sm,
    letterSpacing: 3,
  },
});
