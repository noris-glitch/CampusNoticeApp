import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';

import {
  fetchPublicSettings,
  getApiErrorMessage,
  landingBackgroundUrl,
  loadSession,
  loginWithPassword,
  saveSession,
  warmUpServer,
} from '@/config/api';

const colors = {
  accent: '#0f7b6c',
  accentSoft: '#dff8f2',
  ink: '#10253c',
  muted: '#60738a',
  page: '#f4f7fb',
  panel: '#ffffff',
  stroke: '#d9e3ef',
  warm: '#ff8a5b',
};

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#17324D');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof params.email === 'string' && params.email.trim() !== '') {
      setEmail(params.email.trim());
    }
  }, [params.email]);

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

  useEffect(() => {
    let isMounted = true;

    async function loadPublicSettings() {
      try {
        const response = await fetchPublicSettings();
        if (!isMounted) {
          return;
        }

        setBackgroundColor(response.landing_page.background_color || '#17324D');
        setBackgroundImageUrl(landingBackgroundUrl(response.landing_page.background_image_url) || null);
      } catch {
        if (isMounted) {
          setBackgroundColor('#17324D');
          setBackgroundImageUrl(null);
        }
      }
    }

    void loadPublicSettings();
    return () => {
      isMounted = false;
    };
  }, []);

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

  const authContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={[styles.kicker, styles.heroTextOnMedia]}>JOOUST Campus Notice</Text>
          <Text style={[styles.title, styles.heroTextOnMedia]}>Sign in to your campus workspace.</Text>
          <Text style={[styles.subtitle, styles.heroSubtextOnMedia]}>
            Students can create accounts here, while admins and super admins can sign in with existing credentials.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Use your email and password to continue.</Text>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@jooust.ac.ke"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Your password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.passwordToggle}>
              <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>

          <Pressable disabled={loading} onPress={() => void handleLogin()} style={styles.primaryButton}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/forgot-password' as Href)} style={styles.inlineLink}>
            <Text style={styles.inlineLinkText}>Forgot password?</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>New here?</Text>
            <View style={styles.divider} />
          </View>

          <Pressable onPress={() => router.push('/register' as Href)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Create student account</Text>
          </Pressable>

          <View style={styles.supportCard}>
            <Text style={styles.supportTitle}>Need help getting in?</Text>
            <Text style={styles.supportText}>
              First login may take a few seconds if the Render backend is waking up. If you are an admin without an account, contact the system administrator.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={[styles.screenShell, { backgroundColor }]}>
      {backgroundImageUrl ? (
        <ImageBackground source={{ uri: backgroundImageUrl }} style={styles.backgroundImage} imageStyle={styles.backgroundImageLayer}>
          <View style={styles.backgroundOverlay}>{authContent}</View>
        </ImageBackground>
      ) : (
        authContent
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: 28,
    elevation: 4,
    padding: 22,
    shadowColor: '#10253c',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: '100%',
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
  },
  divider: {
    backgroundColor: colors.stroke,
    flex: 1,
    height: 1,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  hero: {
    marginBottom: 24,
    width: '100%',
  },
  heroSubtextOnMedia: {
    color: 'rgba(255,255,255,0.88)',
  },
  heroTextOnMedia: {
    color: '#ffffff',
  },
  inlineLink: {
    alignSelf: 'flex-end',
    marginTop: 14,
  },
  inlineLinkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: colors.page,
    borderColor: colors.stroke,
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
    marginTop: 12,
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
  passwordInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  passwordRow: {
    alignItems: 'center',
    backgroundColor: colors.page,
    borderColor: colors.stroke,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 8,
  },
  passwordToggle: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  passwordToggleText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    marginTop: 20,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageLayer: {
    opacity: 0.92,
  },
  backgroundOverlay: {
    backgroundColor: 'rgba(9, 20, 33, 0.62)',
    flex: 1,
  },
  screen: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  screenShell: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    marginTop: 20,
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  supportCard: {
    backgroundColor: colors.page,
    borderRadius: 18,
    marginTop: 18,
    padding: 16,
  },
  supportText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  supportTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    marginTop: 8,
  },
});
