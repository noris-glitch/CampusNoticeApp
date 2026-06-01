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
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getApiErrorMessage } from '@/config/api-analytics';
import { fetchRegistrationOptions, registerStudent } from '@/config/api-auth';
import { fetchPublicSettings } from '@/config/api-public';
import { landingBackgroundUrl, warmUpServer } from '@/config/api-core';
import type { DepartmentOption, FacultyOption, YearOption } from '@/config/api-types';
import { loadLandingPageCache, saveLandingPageCache } from '@/config/session-storage';
import {
  isValidLocalPhoneNumber,
  isValidStudentId,
  sanitizePhoneInput,
  sanitizeStudentIdInput,
} from '@/utils/validation';

const fallbackBackgroundImage = require('../../assets/images/logo-glow.png');

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

function Requirement({ label, valid }: { label: string; valid: boolean }) {
  return (
    <View style={styles.requirementRow}>
      <Text style={[styles.requirementIcon, valid ? styles.requirementIconValid : styles.requirementIconInvalid]}>
        {valid ? '✓' : '•'}
      </Text>
      <Text style={[styles.requirementText, valid ? styles.requirementTextValid : null]}>{label}</Text>
    </View>
  );
}

function ChoiceChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const isDark = false;
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [years, setYears] = useState<YearOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#17324D');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundImageFailed, setBackgroundImageFailed] = useState(false);
  const [landingSettingsReady, setLandingSettingsReady] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [membership, setMembership] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<number | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [customDepartment, setCustomDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      setLoading(true);
      try {
        const response = await fetchRegistrationOptions();
        if (!isMounted) {
          return;
        }
        setDepartments(response.departments);
        setFaculties(response.faculties);
        setYears(response.years);
      } catch (loadError) {
        if (isMounted) {
          Alert.alert('Register', getApiErrorMessage(loadError, 'Could not load registration options.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

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
        // Best effort while the backend wakes up.
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

  useEffect(() => {
    if (selectedDepartment === null) {
      return;
    }

    const stillVisible = departments.some(
      (department) =>
        department.id === selectedDepartment &&
        (selectedFaculty === null || department.faculty_id === selectedFaculty || department.faculty_id === null)
    );

    if (!stillVisible) {
      setSelectedDepartment(null);
    }
  }, [departments, selectedDepartment, selectedFaculty]);

  const visibleDepartments = departments.filter(
    (department) =>
      selectedFaculty === null || department.faculty_id === selectedFaculty || department.faculty_id === null
  );

  const passwordChecks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'One number', valid: /[0-9]/.test(password) },
    { label: 'One special character', valid: /[@$!%*?&#]/.test(password) },
  ];

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !studentId.trim() || !password || !confirmPassword) {
      Alert.alert('Register', 'Please fill in all required fields.');
      return;
    }

    if (!isValidStudentId(studentId.trim())) {
      Alert.alert('Register', 'Student ID must use the format XXXX/X/XXXX/XX.');
      return;
    }

    if (phoneNumber.trim() !== '' && !isValidLocalPhoneNumber(phoneNumber.trim())) {
      Alert.alert('Register', 'Phone number must be exactly 10 digits and start with 0.');
      return;
    }

    if (selectedYear === null) {
      Alert.alert('Register', 'Please choose your year of study.');
      return;
    }

    if (faculties.length > 0 && selectedFaculty === null) {
      Alert.alert('Register', 'Please choose your faculty.');
      return;
    }

    setSaving(true);
    try {
      const response = await registerStudent({
        confirm_password: confirmPassword,
        department_id: selectedDepartment,
        department_name: selectedDepartment === null ? customDepartment.trim() || null : null,
        email: email.trim(),
        faculty_id: selectedFaculty,
        membership: membership.trim() || null,
        name: name.trim(),
        password,
        phone_number: phoneNumber.trim() || null,
        student_id: studentId.trim(),
        year: selectedYear,
      });

      Alert.alert('Sign up', response.message || 'Your account has been created.', [
        {
          text: 'Continue to login',
          onPress: () => {
            router.replace({
              pathname: '/',
              params: { email: email.trim() },
            });
          },
        },
      ]);
    } catch (registerError) {
      Alert.alert('Sign up', getApiErrorMessage(registerError, 'Could not create your account right now.'));
    } finally {
      setSaving(false);
    }
  };

  const backgroundImageSource =
    backgroundImageUrl && !backgroundImageFailed ? { uri: backgroundImageUrl } : fallbackBackgroundImage;

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
                <Text style={styles.heroTitle}>Sign up for JOOUST Campus Notice</Text>
                <Text style={styles.heroSubtitle}>
                  Create your account to get notices, alerts, bookmarks, and campus updates in one place.
                </Text>
              </View>
            </ImageBackground>
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroBrand}>JOOUST CAMPUS NOTICE</Text>
              <Text style={styles.heroTitle}>Sign up for JOOUST Campus Notice</Text>
              <Text style={styles.heroSubtitle}>
                Create your account to get notices, alerts, bookmarks, and campus updates in one place.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.formArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.screen}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={[styles.card, isDark ? styles.cardDark : null]}>
                {loading ? (
                  <View style={styles.loadingBlock}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={[styles.loadingText, isDark ? styles.loadingTextDark : null]}>
                      Loading sign up options...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.cardEyebrow, isDark ? styles.cardEyebrowDark : null]}>
                      JOOUST Campus Notice
                    </Text>
                    <Text style={[styles.cardTitle, isDark ? styles.cardTitleDark : null]}>Sign up</Text>

                    <Text style={[styles.label, isDark ? styles.labelDark : null]}>Full name</Text>
                    <TextInput
                      style={[styles.input, isDark ? styles.inputDark : null]}
                      value={name}
                      onChangeText={setName}
                    />

                    <Text style={[styles.label, isDark ? styles.labelDark : null]}>Email address</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      style={[styles.input, isDark ? styles.inputDark : null]}
                      value={email}
                      onChangeText={setEmail}
                    />

                    <Text style={[styles.label, isDark ? styles.labelDark : null]}>Student ID</Text>
                    <TextInput
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={13}
                      placeholder="I231/P/5872/22"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, isDark ? styles.inputDark : null]}
                      value={studentId}
                      onChangeText={(value) => setStudentId(sanitizeStudentIdInput(value))}
                    />
                    <Text style={[styles.helperText, isDark ? styles.helperTextDark : null]}>
                      Use the format XXXX/X/XXXX/XX.
                    </Text>

                    <Text style={[styles.label, isDark ? styles.labelDark : null]}>Phone number</Text>
                    <TextInput
                      keyboardType="number-pad"
                      maxLength={10}
                      placeholder="0712345678"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, isDark ? styles.inputDark : null]}
                      value={phoneNumber}
                      onChangeText={(value) => setPhoneNumber(sanitizePhoneInput(value))}
                    />
                    <Text style={[styles.helperText, isDark ? styles.helperTextDark : null]}>
                      Enter exactly 10 digits.
                    </Text>

                    <Text style={[styles.label, isDark ? styles.labelDark : null]}>Faculty</Text>
                    {faculties.length > 0 ? (
                      <View style={styles.wrapRow}>
                        {faculties.map((faculty) => (
                          <ChoiceChip
                            key={faculty.id}
                            active={selectedFaculty === faculty.id}
                            label={faculty.name}
                            onPress={() => {
                              setSelectedFaculty(faculty.id);
                              setCustomDepartment('');
                            }}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.helperText, isDark ? styles.helperTextDark : null]}>
                        No faculty options are available right now, so this field is left open.
                      </Text>
                    )}

                    <Text style={[styles.label, isDark ? styles.labelDark : null]}>Department</Text>
                    <View style={styles.wrapRow}>
                      <ChoiceChip
                        active={selectedDepartment === null}
                        label="Select later"
                        onPress={() => setSelectedDepartment(null)}
                      />
                      {visibleDepartments.map((department) => (
                        <ChoiceChip
                          key={department.id}
                          active={selectedDepartment === department.id}
                          label={department.name}
                          onPress={() => {
                            setSelectedDepartment(department.id);
                            setCustomDepartment('');
                          }}
                        />
                      ))}
                    </View>
                    <TextInput
                      placeholder="Or type your department name"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, isDark ? styles.inputDark : null]}
                      value={customDepartment}
                      onChangeText={(value) => {
                        setCustomDepartment(value);
                        if (value.trim() !== '') {
                          setSelectedDepartment(null);
                        }
                      }}
                    />

                    <Text style={[styles.label, isDark ? styles.labelDark : null]}>Year of study</Text>
                    {years.length > 0 ? (
                      <View style={styles.wrapRow}>
                        {years.map((year) => (
                          <ChoiceChip
                            key={year.value}
                            active={selectedYear === year.value}
                            label={year.label}
                            onPress={() => setSelectedYear(year.value)}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.helperText, isDark ? styles.helperTextDark : null]}>
                        Year options are not available right now.
                      </Text>
                    )}

                    <Text style={[styles.label, isDark ? styles.labelDark : null]}>
                      Membership or leadership role
                    </Text>
                    <TextInput
                      placeholder="Optional"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, isDark ? styles.inputDark : null]}
                      value={membership}
                      onChangeText={setMembership}
                    />

                    <Text style={[styles.label, isDark ? styles.labelDark : null]}>Password</Text>
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

                    <View style={styles.requirementsCard}>
                      {passwordChecks.map((item) => (
                        <Requirement key={item.label} label={item.label} valid={item.valid} />
                      ))}
                    </View>

                    <Text style={[styles.label, isDark ? styles.labelDark : null]}>Confirm password</Text>
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

                    <Pressable disabled={saving} onPress={() => void handleRegister()} style={styles.primaryButton}>
                      {saving ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Sign up</Text>
                      )}
                    </Pressable>

                    <Pressable onPress={() => router.replace('/')} style={styles.inlineLink}>
                      <Text style={styles.inlineLinkText}>Already have an account? Sign in</Text>
                    </Pressable>
                  </>
                )}
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
    padding: 22,
    shadowColor: '#10253c',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: '100%',
    maxWidth: 420,
  },
  cardDark: {
    backgroundColor: '#0f1e30',
    borderColor: '#233548',
    borderWidth: 1,
  },
  cardEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardEyebrowDark: {
    color: '#7fe0cb',
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
  chip: {
    backgroundColor: '#edf3f9',
    borderRadius: 999,
    marginRight: 8,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  hero: {
    height: 280,
  },
  heroBrand: {
    color: '#d8f5ef',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  heroFallback: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroImageLayer: {
    opacity: 0.9,
    resizeMode: 'cover',
  },
  heroOverlay: {
    backgroundColor: 'rgba(9, 20, 33, 0.54)',
    height: 280,
    justifyContent: 'flex-end',
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
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 12,
  },
  loadingTextDark: {
    color: '#b8c8d9',
  },
  formArea: {
    backgroundColor: colors.page,
    flex: 1,
    marginTop: -30,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  helperText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  helperTextDark: {
    color: '#b8c8d9',
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
  requirementIcon: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 1,
    width: 14,
  },
  requirementIconInvalid: {
    color: colors.warm,
  },
  requirementIconValid: {
    color: colors.accent,
  },
  requirementRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  requirementText: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
  },
  requirementTextValid: {
    color: colors.accent,
  },
  requirementsCard: {
    backgroundColor: colors.page,
    borderRadius: 16,
    marginTop: 10,
    padding: 14,
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  screenDark: {
    backgroundColor: '#091421',
  },
  screenShell: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: 28,
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
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
});
