import React, { useEffect, useState } from 'react';
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

import { getApiErrorMessage } from '@/config/api-analytics';
import { fetchRegistrationOptions, registerStudent } from '@/config/api-auth';
import type { DepartmentOption, FacultyOption, YearOption } from '@/config/api-types';

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

      Alert.alert('Register', response.message || 'Account created successfully.', [
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
      Alert.alert('Register', getApiErrorMessage(registerError, 'Could not create your account right now.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, isDark ? styles.screenDark : null]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={[styles.kicker, isDark ? styles.kickerDark : null]}>Student Sign Up</Text>
          <Text style={[styles.title, isDark ? styles.titleDark : null]}>Create your JOOUST notice account.</Text>
          <Text style={[styles.subtitle, isDark ? styles.subtitleDark : null]}>
            Register once to receive notices, bookmarks, alerts, and campus event updates inside the app.
          </Text>
        </View>

        <View style={[styles.card, isDark ? styles.cardDark : null]}>
          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.loadingText, isDark ? styles.loadingTextDark : null]}>
                Loading registration options...
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.cardTitle, isDark ? styles.cardTitleDark : null]}>Create account</Text>

              <Text style={[styles.label, isDark ? styles.labelDark : null]}>Full name</Text>
              <TextInput style={[styles.input, isDark ? styles.inputDark : null]} value={name} onChangeText={setName} />

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
                style={[styles.input, isDark ? styles.inputDark : null]}
                value={studentId}
                onChangeText={setStudentId}
              />

              <Text style={[styles.label, isDark ? styles.labelDark : null]}>Phone number</Text>
              <TextInput
                keyboardType="phone-pad"
                placeholder="+2547..."
                placeholderTextColor={colors.muted}
                style={[styles.input, isDark ? styles.inputDark : null]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />

              <Text style={[styles.label, isDark ? styles.labelDark : null]}>Faculty</Text>
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

              <Text style={[styles.label, isDark ? styles.labelDark : null]}>Membership or leadership role</Text>
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
                <Pressable onPress={() => setShowConfirmPassword((current) => !current)} style={styles.passwordToggle}>
                  <Text style={styles.passwordToggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>

              <Pressable disabled={saving} onPress={() => void handleRegister()} style={styles.primaryButton}>
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create account</Text>
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
  screen: {
    backgroundColor: colors.page,
    flex: 1,
  },
  screenDark: {
    backgroundColor: '#091421',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
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
