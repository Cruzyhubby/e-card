import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_KEY = '@eclat/gate/session/v1';
const TOKEN_KEY = 'eclat.gate.token';

// SecureStore has no web implementation; Expo web is a development surface only.
const secureTokenSupported = Platform.OS !== 'web';

async function readSecureToken() {
  if (!secureTokenSupported) return null;

  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

async function writeSecureToken(token) {
  if (!secureTokenSupported) return false;

  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function deleteSecureToken() {
  if (!secureTokenSupported) return;

  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    // Nothing stored, nothing to remove.
  }
}

function parseSession(raw) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    return null;
  }
}

export async function loadSession() {
  try {
    const parsed = parseSession(await AsyncStorage.getItem(SESSION_KEY));
    if (!parsed) return null;

    const { token: legacyToken, ...metadata } = parsed;

    if (!secureTokenSupported) {
      return { ...metadata, token: legacyToken || null };
    }

    let token = await readSecureToken();

    // Sessions saved before the token moved to the keychain still carry it in JSON.
    if (legacyToken) {
      if (!token) {
        const stored = await writeSecureToken(legacyToken);
        token = stored ? legacyToken : null;
      }

      if (token) {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(metadata));
      }
    }

    return { ...metadata, token: token || null };
  } catch (error) {
    return null;
  }
}

export async function saveSession(session) {
  try {
    const { token, ...metadata } = session || {};

    if (!secureTokenSupported) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ ...metadata, token }));
      return true;
    }

    if (!token) {
      await deleteSecureToken();
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(metadata));
      return true;
    }

    const stored = await writeSecureToken(token);

    // If the keychain write fails, keep the session usable rather than logging the usher out.
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify(stored ? metadata : { ...metadata, token })
    );

    return true;
  } catch (error) {
    return false;
  }
}

export async function clearSession() {
  try {
    await deleteSecureToken();
    await AsyncStorage.removeItem(SESSION_KEY);
    return true;
  } catch (error) {
    return false;
  }
}
