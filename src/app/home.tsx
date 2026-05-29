import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';

import NativeAppShell from '@/components/native-app-shell';
import { clearSession, loadSession, StoredUser } from '@/config/api';

export default function HomeScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [session, setSession] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const stored = await loadSession();

      if (!stored) {
        router.replace('/');
        return;
      }

      if (isMounted) {
        setSession(stored);
        setLoading(false);
      }
    }

    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await clearSession();
    router.replace('/');
  };

  if (loading || !session) {
    return (
      <View style={[styles.loadingScreen, isDark ? styles.loadingScreenDark : null]}>
        <ActivityIndicator color="#0f7b6c" size="large" />
        <Text style={[styles.loadingText, isDark ? styles.loadingTextDark : null]}>
          Loading your dashboard...
        </Text>
      </View>
    );
  }

  return (
    <NativeAppShell
      session={session}
      onLogout={handleLogout}
      onSessionUpdated={async (user) => {
        setSession(user);
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#f4f7fb',
    flex: 1,
    justifyContent: 'center',
  },
  loadingScreenDark: {
    backgroundColor: '#091421',
  },
  loadingText: {
    color: '#60738a',
    fontSize: 14,
    marginTop: 12,
  },
  loadingTextDark: {
    color: '#b8c8d9',
  },
});
