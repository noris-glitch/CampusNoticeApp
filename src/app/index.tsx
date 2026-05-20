import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  getApiErrorMessage,
  loadSession,
  loginWithPassword,
  saveSession,
  warmUpServer,
} from '@/config/api';

const colors = {
  accent: '#0f7b6c',
  ink: '#10253c',
  muted: '#60738a',
  page: '#f4f7fb',
  panel: '#ffffff',
  warm: '#ff8a5b',
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const stored = await loadSession();
        if (stored && isMounted) {
          router.replace('/home');
          return;
        }
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Login', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await warmUpServer().catch(() => {
        // Render warm-up is best-effort.
      });
      const user = await loginWithPassword(email.trim(), password);
      await saveSession(user);
      router.replace('/home');
    } catch (loginError) {
      Alert.alert('Login', getApiErrorMessage(loginError, 'Could not log in right now.'));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Preparing your campus workspace...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>JOOUST Campus Notice</Text>
        <Text style={styles.title}>Native access for students, admins, and super admins.</Text>
        <Text style={styles.subtitle}>
          Log in once and work directly in the app without relying on the website wrapper.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Login</Text>
        <Text style={styles.label}>Email address</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@jooust.ac.ke"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Your password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <Pressable disabled={loading} onPress={() => void handleLogin()} style={styles.button}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Open dashboard</Text>
          )}
        </Pressable>

        <Text style={styles.helper}>
          First login may take a few seconds if the Render backend is waking up.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    marginTop: 18,
    paddingVertical: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 24,
    elevation: 4,
    padding: 22,
    shadowColor: '#10253c',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: '100%',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  hero: {
    marginBottom: 24,
    width: '100%',
  },
  input: {
    backgroundColor: colors.page,
    borderColor: '#d9e3ef',
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: colors.page,
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 12,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    marginTop: 8,
  },
});
