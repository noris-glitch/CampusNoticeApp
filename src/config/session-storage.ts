import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { LandingPageCache, StoredUser } from './api-types';

const LEGACY_SESSION_STORAGE_KEY = 'campus_notice_session';
export const SESSION_PROFILE_STORAGE_KEY = 'campus_notice_session_profile';
export const SESSION_TOKEN_STORAGE_KEY = 'campus_notice_session_token';
export const LANDING_PAGE_CACHE_KEY = 'campus_notice_landing_page';

let secureStoreAvailablePromise: Promise<boolean> | null = null;

async function canUseSecureStore(): Promise<boolean> {
  if (!secureStoreAvailablePromise) {
    secureStoreAvailablePromise = SecureStore.isAvailableAsync().catch(() => false);
  }

  return secureStoreAvailablePromise;
}

async function saveSensitiveValue(key: string, value: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

async function loadSensitiveValue(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(key);
  }

  return AsyncStorage.getItem(key);
}

async function deleteSensitiveValue(key: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  await AsyncStorage.removeItem(key);
}

async function loadLegacySession(): Promise<StoredUser | null> {
  const legacyStored =
    (await AsyncStorage.getItem(LEGACY_SESSION_STORAGE_KEY)) ?? (await loadSensitiveValue(LEGACY_SESSION_STORAGE_KEY));

  if (!legacyStored) {
    return null;
  }

  try {
    return JSON.parse(legacyStored) as StoredUser;
  } catch {
    await AsyncStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
    await deleteSensitiveValue(LEGACY_SESSION_STORAGE_KEY);
    return null;
  }
}

async function clearLegacySession(): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  await deleteSensitiveValue(LEGACY_SESSION_STORAGE_KEY);
}

export async function saveLandingPageCache(settings: LandingPageCache): Promise<void> {
  await AsyncStorage.setItem(LANDING_PAGE_CACHE_KEY, JSON.stringify(settings));
}

export async function loadLandingPageCache(): Promise<LandingPageCache | null> {
  const stored = await AsyncStorage.getItem(LANDING_PAGE_CACHE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as LandingPageCache;
  } catch {
    await AsyncStorage.removeItem(LANDING_PAGE_CACHE_KEY);
    return null;
  }
}

export async function saveSession(user: StoredUser): Promise<void> {
  const { token, ...profile } = user;

  await AsyncStorage.setItem(SESSION_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  await saveSensitiveValue(SESSION_TOKEN_STORAGE_KEY, token);
  await clearLegacySession();
}

export async function loadSession(): Promise<StoredUser | null> {
  const [storedProfile, storedToken] = await Promise.all([
    AsyncStorage.getItem(SESSION_PROFILE_STORAGE_KEY),
    loadSensitiveValue(SESSION_TOKEN_STORAGE_KEY),
  ]);

  if (storedProfile && storedToken) {
    try {
      const profile = JSON.parse(storedProfile) as Omit<StoredUser, 'token'>;
      return { ...profile, token: storedToken };
    } catch {
      await clearSession();
      return null;
    }
  }

  if (storedProfile || storedToken) {
    await clearSession();
  }

  const legacySession = await loadLegacySession();
  if (!legacySession) {
    return null;
  }

  await saveSession(legacySession);
  await clearLegacySession();
  return legacySession;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_PROFILE_STORAGE_KEY);
  await deleteSensitiveValue(SESSION_TOKEN_STORAGE_KEY);
  await clearLegacySession();
}
