import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';

import BottomNav from './BottomNav';
import CallingTab from './CallingTab';
import ChangePasswordScreen from './ChangePasswordScreen';
import HistoryTab from './HistoryTab';
import HomeTab from './HomeTab';
import ProfileTab from './ProfileTab';
import ScanTab from './ScanTab';
import TopBar from './TopBar';
import { ApiError, createApi } from '../lib/api';
import { playFeedback } from '../lib/feedback';
import {
  DUPLICATE_WINDOW_MS,
  REQUEST_COOLDOWN_MS,
  SCAN_STATUS,
  extractQrToken,
  summarizeVerify,
} from '../lib/scan';
import { colors } from '../theme';

export default function GateScreen({ session, onSignOut, onSessionExpired }) {
  useKeepAwake();

  const api = useMemo(
    () => createApi({ baseUrl: session.baseUrl, token: session.token }),
    [session.baseUrl, session.token]
  );
  const [permission, requestPermission] = useCameraPermissions();
  const [tab, setTab] = useState('home');
  const [mode, setMode] = useState('camera');
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [scans, setScans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [gate, setGate] = useState(null);
  const [gateError, setGateError] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const callingEnabled = Boolean(session.user && session.user.calling_enabled);
  const navTabs = useMemo(
    () =>
      callingEnabled
        ? [
            { id: 'home', label: 'Home', icon: 'home' },
            { id: 'scan', label: 'Scan', icon: 'scan' },
            { id: 'calls', label: 'Calls', icon: 'phone' },
            { id: 'history', label: 'History', icon: 'history' },
            { id: 'profile', label: 'Profile', icon: 'user' },
          ]
        : undefined,
    [callingEnabled]
  );

  const alive = useRef(true);
  const verifying = useRef(false);
  const recentTokens = useRef(new Map());
  const cooldownUntil = useRef(0);
  const sequence = useRef(0);
  const expireTimer = useRef(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (expireTimer.current) clearTimeout(expireTimer.current);
    };
  }, []);

  useEffect(() => {
    // Validate a restored token without blocking the gate; network failures are ignored here.
    let cancelled = false;
    api.me().catch((error) => {
      if (cancelled) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) onSessionExpired();
    });
    return () => {
      cancelled = true;
    };
  }, [api, onSessionExpired]);

  const refreshGate = useCallback(async () => {
    try {
      const data = await api.gateStats();
      if (alive.current) {
        setGate(data);
        setGateError(false);
      }
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        onSessionExpired();
        return;
      }
      if (alive.current) setGateError(true);
    }
  }, [api, onSessionExpired]);

  useEffect(() => {
    refreshGate();
    const timer = setInterval(refreshGate, 30000);
    return () => clearInterval(timer);
  }, [refreshGate]);

  const counts = useMemo(() => {
    return scans.reduce(
      (totals, scan) => {
        if (scan.status === SCAN_STATUS.VALID) totals.valid += 1;
        else if (scan.status === SCAN_STATUS.ALREADY) totals.duplicates += 1;
        else if (scan.status === SCAN_STATUS.DENIED) totals.denied += 1;
        return totals;
      },
      { valid: 0, duplicates: 0, denied: 0 }
    );
  }, [scans]);

  const verifyToken = useCallback(
    async (rawValue, source = 'camera') => {
      const token = extractQrToken(rawValue);
      if (!token) return;

      const now = Date.now();
      if (verifying.current) return;

      if (source === 'camera') {
        const lastAt = recentTokens.current.get(token);
        if (lastAt && now - lastAt < DUPLICATE_WINDOW_MS) return;
        if (now < cooldownUntil.current) return;
      }

      recentTokens.current.set(token, now);
      if (recentTokens.current.size > 25) {
        recentTokens.current.forEach((at, key) => {
          if (now - at > DUPLICATE_WINDOW_MS) recentTokens.current.delete(key);
        });
      }
      cooldownUntil.current = now + REQUEST_COOLDOWN_MS;
      verifying.current = true;
      setBusy(true);

      try {
        const data = await api.verify(token, session.deviceId);
        if (!alive.current) return;

        const outcome = summarizeVerify(data);
        sequence.current += 1;
        setScans((previous) => [
          {
            id: `${now}-${sequence.current}`,
            token,
            source,
            status: outcome.status,
            name: outcome.name,
            table: outcome.table,
            message: outcome.message,
            checkedInAt: outcome.checkedInAt,
            scannedAt: new Date(now).toISOString(),
          },
          ...previous,
        ]);

        playFeedback(
          outcome.status === SCAN_STATUS.VALID
            ? 'success'
            : outcome.status === SCAN_STATUS.ALREADY
              ? 'warning'
              : 'error'
        );

        setResult({
          variant:
            outcome.status === SCAN_STATUS.VALID
              ? 'valid'
              : outcome.status === SCAN_STATUS.ALREADY
                ? 'duplicate'
                : 'denied',
          name: outcome.name,
          table: outcome.table,
          message: outcome.message,
          checkedInAt: outcome.checkedInAt,
          token,
        });
        refreshGate();
      } catch (error) {
        if (!alive.current) return;

        if (error instanceof ApiError && error.status === 401) {
          playFeedback('error');
          setResult({
            variant: 'expired',
            message: 'Your session has ended. Sign in again to keep scanning.',
            token,
          });
          if (expireTimer.current) clearTimeout(expireTimer.current);
          expireTimer.current = setTimeout(() => {
            if (alive.current) onSessionExpired();
          }, 1600);
          return;
        }

        const message = (error && error.message) || 'Could not reach the server. Check the connection.';
        sequence.current += 1;
        setScans((previous) => [
          {
            id: `${now}-${sequence.current}`,
            token,
            source,
            status: SCAN_STATUS.ERROR,
            name: null,
            table: null,
            message,
            checkedInAt: null,
            scannedAt: new Date(now).toISOString(),
          },
          ...previous,
        ]);
        playFeedback('error');
        setResult({ variant: 'network', message, token });
      } finally {
        verifying.current = false;
        if (alive.current) setBusy(false);
      }
    },
    [api, session.deviceId, onSessionExpired, refreshGate]
  );

  const handleBarcodeScanned = useCallback(
    ({ data }) => {
      if (!data) return;
      verifyToken(data, 'camera');
    },
    [verifyToken]
  );

  const requestCamera = useCallback(async () => {
    try {
      await requestPermission();
    } catch (error) {
      Alert.alert('Camera unavailable', 'Could not request camera permission on this device.');
    }
  }, [requestPermission]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert('Open settings', 'Enable camera access for Éclat Gate in your device settings.');
    });
  }, []);

  const changeTab = useCallback((next) => {
    setTorch(false);
    setTab(next);
  }, []);

  const changeMode = useCallback((next) => {
    if (next !== 'camera') setTorch(false);
    setMode(next);
  }, []);

  const openManual = useCallback(() => {
    setTorch(false);
    setMode('manual');
    setTab('scan');
  }, []);

  const openScanner = useCallback(() => {
    setMode('camera');
    setTab('scan');
  }, []);

  if (changingPassword) {
    return (
      <ChangePasswordScreen
        baseUrl={session.baseUrl}
        token={session.token}
        name={session.user && session.user.name}
        onDone={() => setChangingPassword(false)}
        onCancel={() => setChangingPassword(false)}
        onSessionExpired={onSessionExpired}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <TopBar
        user={session.user}
        deviceId={session.deviceId}
        online={Boolean(gate) && !gateError}
        onProfile={() => changeTab('profile')}
      />

      <View style={styles.body}>
        {tab === 'home' ? (
          <HomeTab
            user={session.user}
            event={session.event}
            deviceId={session.deviceId}
            gate={gate}
            syncError={gateError}
            counts={counts}
            onScan={openScanner}
            onManual={openManual}
            onHistory={() => changeTab('history')}
            onRetry={refreshGate}
          />
        ) : null}

        {tab === 'scan' ? (
          <ScanTab
            event={session.event}
            deviceId={session.deviceId}
            permission={permission}
            torch={torch}
            facing={facing}
            busy={busy}
            paused={busy}
            result={result}
            scans={scans}
            mode={mode}
            onChangeMode={changeMode}
            onBarcodeScanned={handleBarcodeScanned}
            onToggleTorch={() => setTorch((value) => !value)}
            onFlip={() => {
              setTorch(false);
              setFacing((value) => (value === 'back' ? 'front' : 'back'));
            }}
            onRequestPermission={requestCamera}
            onOpenSettings={openSettings}
            onManualVerify={(value) => verifyToken(value, 'manual')}
            onDismissResult={() => setResult(null)}
            onHistory={() => changeTab('history')}
          />
        ) : null}

        {tab === 'calls' ? (
          <CallingTab api={api} event={session.event} onSessionExpired={onSessionExpired} />
        ) : null}

        {tab === 'history' ? <HistoryTab scans={scans} onClear={() => setScans([])} /> : null}

        {tab === 'profile' ? (
          <ProfileTab
            user={session.user}
            event={session.event}
            deviceId={session.deviceId}
            onChangePassword={() => setChangingPassword(true)}
            onSignOut={onSignOut}
          />
        ) : null}
      </View>

      <BottomNav active={tab} onChange={changeTab} tabs={navTabs} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    flex: 1,
  },
});
