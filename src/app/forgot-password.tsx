import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';

import {
  getApiErrorMessage,
  requestPasswordReset,
  submitPasswordReset,
} from '@/config/api';

const colors = {
  accent: '#0f7b6c',
  accentSoft: '#dff8f2',
  ink: '#10253c',
  muted: '#60738a',
  page: '#f4f7fb',
  panel: '#ffffff',
  stroke: '#d9e3ef',
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestReset = async () => {
    if (!email.trim()) {
      Alert.alert('Reset password', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordReset(email.trim());
      if (!response.reset_token) {
        throw new Error('Reset request was created, but no reset token was returned.');
      }
      setResetToken(response.reset_token);
      Alert.alert('Reset password', response.message || 'Reset request created successfully.');
    } catch (resetError) {
      Alert.alert('Reset password', getApiErrorMessage(resetError, 'Could not start password reset right now.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async () => {
    if (!resetToken) {
      Alert.alert('Reset password', 'Start a reset request first.');
      return;
    }

    if (!password || !confirmPassword) {
      Alert.alert('Reset password', 'Please enter and confirm your new password.');
      return;
    }

    setLoading(true);
    try {
      const response = await submitPasswordReset({
        confirm_password: confirmPassword,
        password,
        token: resetToken,
      });

      Alert.alert('Reset password', response.message || 'Password reset successfully.', [
        {
          text: 'Back to login',
          onPress: () => {
            router.replace({
              pathname: '/',
              params: { email: email.trim() },
            });
          },
        },
      ]);
    } catch (resetError) {
      Alert.alert('Reset password', getApiErrorMessage(resetError, 'Could not reset your password right now.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, isDark ? styles.screenDark : null]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={[styles.kicker, isDark ? styles.kickerDark : null]}>Password Recovery</Text>
          <Text style={[styles.title, isDark ? styles.titleDark : null]}>Reset your password in the app.</Text>
          <Text style={[styles.subtitle, isDark ? styles.subtitleDark : null]}>
            Enter your account email first, then set a new password as soon as the reset request is created.
          </Text>
        </View>

        <View style={[styles.card, isDark ? styles.cardDark : null]}>
          <Text style={[styles.cardTitle, isDark ? styles.cardTitleDark : null]}>Forgot password</Text>
          <Text style={[styles.label, isDark ? styles.labelDark : null]}>Email address</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@jooust.ac.ke"
            placeholderTextColor={colors.muted}
            style={[styles.input, isDark ? styles.inputDark : null]}
            value={email}
            onChangeText={setEmail}
          />

          <Pressable disabled={loading} onPress={() => void handleRequestReset()} style={styles.secondaryButton}>
            {loading && !resetToken ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {resetToken ? 'Create a fresh reset request' : 'Start reset'}
              </Text>
            )}
          </Pressable>

          {resetToken ? (
            <View style={[styles.resetPanel, isDark ? styles.resetPanelDark : null]}>
              <Text style={[styles.resetPanelTitle, isDark ? styles.resetPanelTitleDark : null]}>New password</Text>
              <Text style={[styles.resetPanelText, isDark ? styles.resetPanelTextDark : null]}>
                Your reset request is ready. Set the new password below, then return to sign in.
              </Text>

              <Text style={[styles.label, isDark ? styles.labelDark : null]}>New password</Text>
              <View style={[styles.passwordRow, isDark ? styles.passwordRowDark : null]}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showPassword}
                  style={[styles.passwordInput, isDark ? styles.passwordInputDark : null]}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.passwordToggle}>
                  <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>

              <Text style={[styles.label, isDark ? styles.labelDark : null]}>Confirm new password</Text>
              <View style={[styles.passwordRow, isDark ? styles.passwordRowDark : null]}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showConfirmPassword}
                  style={[styles.passwordInput, isDark ? styles.passwordInputDark : null]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((current) => !current)}
                  style={styles.passwordToggle}
                >
                  <Text style={styles.passwordToggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>

              <Pressable disabled={loading} onPress={() => void handleCompleteReset()} style={styles.primaryButton}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save new password</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          <Pressable onPress={() => router.replace('/')} style={styles.inlineLink}>
            <Text style={styles.inlineLinkText}>Back to login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  cardDark: {
    backgroundColor: '#0f1e30',
    borderColor: '#233548',
    borderWidth: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardTitleDark: {
    color: '#f8fbff',
  },
  hero: {
    marginBottom: 24,
    width: '100%',
  },
  inlineLink: {
    alignSelf: 'center',
    marginTop: 18,
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
  inputDark: {
    backgroundColor: '#0b1523',
    borderColor: '#233548',
    color: '#f8fbff',
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  kickerDark: {
    color: '#7fe0cb',
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  labelDark: {
    color: '#c9d7e4',
  },
  passwordInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  passwordInputDark: {
    color: '#f8fbff',
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
  passwordRowDark: {
    backgroundColor: '#0b1523',
    borderColor: '#233548',
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
  resetPanel: {
    backgroundColor: colors.page,
    borderRadius: 18,
    marginTop: 20,
    padding: 16,
  },
  resetPanelDark: {
    backgroundColor: '#0b1523',
    borderColor: '#233548',
    borderWidth: 1,
  },
  resetPanelText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  resetPanelTextDark: {
    color: '#b8c8d9',
  },
  resetPanelTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  resetPanelTitleDark: {
    color: '#f8fbff',
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
  },
  screenDark: {
    backgroundColor: '#091421',
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
  subtitleDark: {
    color: '#b8c8d9',
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    marginTop: 8,
  },
  titleDark: {
    color: '#f8fbff',
  },
});
