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
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getApiErrorMessage } from '@/config/api-analytics';
import { fetchPublicSettings } from '@/config/api-public';
import { loginWithPassword } from '@/config/api-auth';
import { landingBackgroundUrl, warmUpServer } from '@/config/api-core';
import { loadLandingPageCache, loadSession, saveLandingPageCache, saveSession } from '@/config/session-storage';

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

const fallbackBackgroundImage = require('../../assets/images/logo-glow.png');

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
  const [backgroundImageFailed, setBackgroundImageFailed] = useState(false);
  const [landingSettingsReady, setLandingSettingsReady] = useState(false);
  const backgroundImageSource =
    backgroundImageUrl && !backgroundImageFailed ? { uri: backgroundImageUrl } : fallbackBackgroundImage;

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
      const cached = await loadLandingPageCache().catch(() => null);
      if (isMounted && cached) {
        setBackgroundColor(cached.background_color || '#17324D');
        setBackgroundImageUrl(landingBackgroundUrl(cached.background_image_url, cached.background_image));
        setBackgroundImageFailed(false);
        setLandingSettingsReady(true);
      }

      const applySettings = (response: Awaited<ReturnType<typeof fetchPublicSettings>>) => {
        const nextColor = response.landing_page.background_color || '#17324D';
        const nextImage = landingBackgroundUrl(
          response.landing_page.background_image_url,
          response.landing_page.background_image
        );

        setBackgroundColor(nextColor);
        setBackgroundImageUrl(nextImage || null);
        setBackgroundImageFailed(false);
        setLandingSettingsReady(true);
        void saveLandingPageCache({
          background_color: nextColor,
          background_image: response.landing_page.background_image,
          background_image_url: response.landing_page.background_image_url,
        });
      };

      await warmUpServer().catch(() => {
        // Best effort: if the backend is waking up, the settings request can still succeed next.
      });

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetchPublicSettings();
          if (!isMounted) {
            return;
          }

          applySettings(response);
          return;
        } catch {
          if (!isMounted || attempt === 1) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 900));
        }
      }

      if (isMounted) {
        setBackgroundColor('#17324D');
        setBackgroundImageUrl(null);
        setBackgroundImageFailed(false);
        setLandingSettingsReady(true);
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

  return (
    <SafeAreaView edges={['top', 'right', 'left']} style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar style="light" />

      <View style={styles.screenShell}>
        <View style={[styles.hero, { backgroundColor }]}>
          {backgroundImageSource && landingSettingsReady ? (
            <ImageBackground
              source={backgroundImageSource}
              style={styles.heroImage}
              imageStyle={styles.heroImageLayer}
              onError={() => setBackgroundImageFailed(true)}
            >
              <View style={styles.heroOverlay}>
                <Text style={styles.heroBrand}>JOOUST CAMPUS NOTICE</Text>
                <Text style={styles.heroTitle}>Welcome to JOOUST Campus Notice</Text>
                <Text style={styles.heroSubtitle}>
                  Sign in to continue to your campus notices, alerts, and updates.
                </Text>
              </View>
            </ImageBackground>
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroBrand}>JOOUST CAMPUS NOTICE</Text>
              <Text style={styles.heroTitle}>Welcome to JOOUST Campus Notice</Text>
              <Text style={styles.heroSubtitle}>
                Sign in to continue to your campus notices, alerts, and updates.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.formArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.screen}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.card}>
                <Text style={styles.cardEyebrow}>JOOUST Campus Notice</Text>
                <Text style={styles.cardTitle}>Welcome back</Text>
                <Text style={styles.cardSubtitle}>
                  Use your email and password to continue.
                </Text>

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
                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    style={styles.passwordToggle}
                  >
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
                  <Text style={styles.secondaryButtonText}>Sign up</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: 28,
    elevation: 4,
    padding: 24,
    shadowColor: '#10253c',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: '100%',
    maxWidth: 420,
  },
  cardEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
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
  formArea: {
    backgroundColor: colors.page,
    flex: 1,
    marginTop: -30,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  hero: {
    height: 280,
  },
  heroFallback: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  heroBrand: {
    color: '#d8f5ef',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroImageLayer: {
    resizeMode: 'cover',
    opacity: 0.9,
  },
  heroOverlay: {
    backgroundColor: 'rgba(9, 20, 33, 0.54)',
    justifyContent: 'flex-end',
    height: 280,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  heroSubtitle: {
    color: '#d8e6f2',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 360,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 10,
    maxWidth: 360,
  },
  safeArea: {
    flex: 1,
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
    resizeMode: 'cover',
    opacity: 0.92,
  },
  backgroundOverlay: {
    backgroundColor: 'rgba(9, 20, 33, 0.62)',
    flex: 1,
  },
  backgroundOverlayDark: {
    backgroundColor: 'rgba(5, 10, 18, 0.82)',
  },
  backgroundFallback: {
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
    justifyContent: 'flex-start',
    paddingBottom: 28,
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
  cardDark: {
    backgroundColor: '#0f1e30',
    borderColor: '#233548',
    borderWidth: 1,
  },
  cardTitleDark: {
    color: '#f8fbff',
  },
  cardSubtitleDark: {
    color: '#b8c8d9',
  },
  inputDark: {
    backgroundColor: '#0b1523',
    borderColor: '#233548',
    color: '#f8fbff',
  },
  labelDark: {
    color: '#c9d7e4',
  },
  passwordInputDark: {
    color: '#f8fbff',
  },
  passwordRowDark: {
    backgroundColor: '#0b1523',
    borderColor: '#233548',
  },
});
