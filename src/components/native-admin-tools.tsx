import * as DocumentPicker from 'expo-document-picker';
import React, { useDeferredValue, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  clearLandingPageBackground,
  createDepartment,
  createEmergencyAlert,
  createFaculty,
  createManagedUser,
  deleteDepartment,
  deleteFaculty,
  deleteManagedUser,
  EmergencyAlertItem,
  fetchEmergencyAlerts,
  fetchManageUsers,
  fetchStudentSyncInfo,
  getApiErrorMessage,
  landingBackgroundUrl,
  ManageUsersResponse,
  ManagedUserItem,
  SimpleSuccessResponse,
  StoredUser,
  StudentSyncResponse,
  updateManagedUser,
  updateLandingPageTheme,
  UploadAsset,
  uploadLandingPageBackground,
  uploadStudentSyncFile,
  UserRole,
} from '@/config/api';

const palette = {
  accent: '#0f7b6c',
  accentSoft: '#dff8f2',
  bg: '#f4f7fb',
  card: '#ffffff',
  danger: '#d9485f',
  dangerSoft: '#ffe3e7',
  ink: '#10253c',
  line: '#d9e3ef',
  muted: '#60738a',
  navy: '#17324d',
  warm: '#ff8a5b',
  warmSoft: '#ffe9dd',
};

interface BaseProps {
  isActive: boolean;
  onDirty: () => void;
  refreshToken: number;
  session: StoredUser;
}

interface UserDraft {
  admin_type: string;
  can_post_shorts: boolean;
  department_id: number | null;
  department_name: string;
  email: string;
  faculty_id: number | null;
  is_active: boolean;
  membership: string;
  name: string;
  password: string;
  phone_number: string;
  role: UserRole;
  student_id: string;
  user_id: number | null;
  year: number | null;
}

const emptyUserDraft: UserDraft = {
  admin_type: '',
  can_post_shorts: false,
  department_id: null,
  department_name: '',
  email: '',
  faculty_id: null,
  is_active: true,
  membership: '',
  name: '',
  password: '',
  phone_number: '',
  role: 'student',
  student_id: '',
  user_id: null,
  year: null,
};

function SectionIntro({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <View>
      <Text style={styles.headline}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

function ChoicePill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choicePill, active ? styles.choicePillActive : null]}>
      <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({
  disabled,
  label,
  onPress,
  tone,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone: 'accent' | 'danger' | 'navy' | 'warm';
}) {
  const colors = {
    accent: palette.accent,
    danger: palette.danger,
    navy: palette.navy,
    warm: palette.warm,
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: colors[tone] },
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.stateCard}>
      <ActivityIndicator color={palette.accent} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <View style={[styles.stateCard, styles.errorCard]}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  onValueChange,
  value,
}: {
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        thumbColor="#ffffff"
        trackColor={{ false: '#c8d6e6', true: palette.accent }}
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return 'Not scheduled';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatUserDraft(source?: ManagedUserItem | null): UserDraft {
  if (!source) {
    return { ...emptyUserDraft };
  }

  return {
    admin_type: source.admin_type || '',
    can_post_shorts: Boolean(source.can_post_shorts),
    department_id: source.department_id ?? null,
    department_name: source.department_name || '',
    email: source.email,
    faculty_id: source.faculty_id ?? null,
    is_active: Boolean(source.is_active),
    membership: source.membership || '',
    name: source.name,
    password: '',
    phone_number: source.phone_number || '',
    role: source.role,
    student_id: source.student_id || '',
    user_id: source.id,
    year: source.year ?? null,
  };
}

export function HelpSupportSection() {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <SectionIntro
        title="Help & support"
        subtitle="The mobile app now covers the same main workflows as the web version, but here are the fastest recovery steps when something feels off."
      />

      <Panel>
        <Text style={styles.sectionTitle}>Login help</Text>
        <Text style={styles.bodyText}>If sign-in hangs, wait a few seconds and try again. The Render server can take a moment to wake up on the first request.</Text>
        <Text style={styles.bodyText}>Students can create accounts from the login screen. Admins and super admins should use their issued credentials.</Text>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Notice tools</Text>
        <Text style={styles.bodyText}>Students can view notices, manage bookmarks, acknowledge required notices, share location, and browse mapped campus events.</Text>
        <Text style={styles.bodyText}>Admins and super admins can create notices, create mapped location events, manage existing notices, and use the role-specific management tools in the drawer.</Text>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>When to contact support</Text>
        <Text style={styles.bodyText}>Reach out to the system administrator if your role is wrong, your faculty data is missing, your password reset email is not working, or an admin tool rejects an action that works on the website.</Text>
      </Panel>
    </ScrollView>
  );
}

export function EmergencyAlertsSection({ isActive, onDirty, refreshToken, session }: BaseProps) {
  const [response, setResponse] = useState<Awaited<ReturnType<typeof fetchEmergencyAlerts>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('critical');
  const [targetFaculty, setTargetFaculty] = useState<number | null>(null);
  const [targetYear, setTargetYear] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const canCreateAlerts = response?.can_create ?? (session.role === 'super_admin');

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchEmergencyAlerts(session);
        if (isMounted) {
          setResponse(next);
          if (next.severities.critical) {
            setSeverity((current) => current || 'critical');
          }
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load emergency alert tools.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [isActive, refreshToken, session]);

  const submit = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Emergency alert', 'Title and message are required.');
      return;
    }

    setSaving(true);
    try {
      const result = await createEmergencyAlert(session, {
        expires_at: expiresAt.trim() || null,
        message: message.trim(),
        severity,
        target_faculty: targetFaculty,
        target_year: targetYear,
        title: title.trim(),
      });

      Alert.alert('Emergency alert', result.message || 'Emergency alert sent successfully.');
      setTitle('');
      setMessage('');
      setTargetFaculty(null);
      setTargetYear(null);
      setExpiresAt('');
      onDirty();
      const next = await fetchEmergencyAlerts(session);
      setResponse(next);
    } catch (saveError) {
      Alert.alert('Emergency alert', getApiErrorMessage(saveError, 'Could not send the emergency alert.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <SectionIntro
        title="Emergency alerts"
        subtitle={
          canCreateAlerts
            ? 'Send urgent campus-wide or targeted emergency notices to students.'
            : 'See urgent campus alerts posted by super administrators.'
        }
      />

      {response ? (
        <View style={styles.metricGrid}>
          <MetricCard label="Active alerts" value={response.active_count} />
          <MetricCard label="Recent alerts" value={response.alerts.length} />
        </View>
      ) : null}

      {canCreateAlerts ? (
        <Panel>
          <Text style={styles.sectionTitle}>Create emergency alert</Text>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.label}>Message</Text>
          <TextInput multiline style={[styles.input, styles.textArea]} value={message} onChangeText={setMessage} />
          <Text style={styles.label}>Severity</Text>
          <View style={styles.wrapRow}>
            {Object.keys(response?.severities || { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }).map((item) => (
              <ChoicePill key={item} active={severity === item} label={item} onPress={() => setSeverity(item)} />
            ))}
          </View>
          <Text style={styles.label}>Target faculty</Text>
          <View style={styles.wrapRow}>
            <ChoicePill active={targetFaculty === null} label="All faculties" onPress={() => setTargetFaculty(null)} />
            {(response?.faculties || []).map((faculty) => (
              <ChoicePill
                key={faculty.id}
                active={targetFaculty === faculty.id}
                label={faculty.name}
                onPress={() => setTargetFaculty(faculty.id)}
              />
            ))}
          </View>
          <Text style={styles.label}>Target year</Text>
          <View style={styles.wrapRow}>
            <ChoicePill active={targetYear === null} label="All years" onPress={() => setTargetYear(null)} />
            {(response?.years || []).map((yearOption) => (
              <ChoicePill
                key={yearOption.value}
                active={targetYear === yearOption.value}
                label={yearOption.label}
                onPress={() => setTargetYear(yearOption.value)}
              />
            ))}
          </View>
          <Text style={styles.label}>Expires at</Text>
          <TextInput
            placeholder="YYYY-MM-DD HH:MM"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={expiresAt}
            onChangeText={setExpiresAt}
          />
          <ActionButton
            disabled={saving}
            label={saving ? 'Sending...' : 'Send emergency alert'}
            onPress={() => void submit()}
            tone="danger"
          />
        </Panel>
      ) : null}

      {loading ? <LoadingState label="Loading emergency alerts..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && response ? (
        <Panel>
          <Text style={styles.sectionTitle}>{canCreateAlerts ? 'Recent emergency alerts' : 'Active emergency alerts'}</Text>
          {response.alerts.length === 0 ? (
            <Text style={styles.helperText}>
              {canCreateAlerts ? 'No emergency alerts have been sent yet.' : 'There are no active emergency alerts for you right now.'}
            </Text>
          ) : (
            response.alerts.map((alertItem: EmergencyAlertItem) => (
              <View key={alertItem.id} style={styles.listCard}>
                <View style={styles.inlineRowWrap}>
                  <Text style={styles.badge}>{alertItem.severity.toUpperCase()}</Text>
                  {alertItem.is_active ? <Text style={[styles.badge, styles.badgeWarm]}>ACTIVE</Text> : null}
                </View>
                <Text style={styles.cardTitle}>{alertItem.title}</Text>
                <Text style={styles.bodyText}>{alertItem.message}</Text>
                <Text style={styles.metaText}>
                  {alertItem.author_name || 'System'} · {formatDateLabel(alertItem.created_at)}
                </Text>
                {canCreateAlerts ? (
                  <Text style={styles.metaText}>
                    Read by {alertItem.read_count}/{alertItem.total_recipients} students
                  </Text>
                ) : null}
                <Text style={styles.metaText}>Expires: {formatDateLabel(alertItem.expires_at)}</Text>
              </View>
            ))
          )}
        </Panel>
      ) : null}
    </ScrollView>
  );
}

export function ManageUsersSection({ isActive, onDirty, refreshToken, session }: BaseProps) {
  const [response, setResponse] = useState<ManageUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserDraft>({ ...emptyUserDraft });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchManageUsers(session);
        if (isMounted) {
          setResponse(next);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load the user manager.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [isActive, refreshToken, session]);

  const refresh = async () => {
    const next = await fetchManageUsers(session);
    setResponse(next);
  };

  const users = (response?.users || []).filter((item) => {
    const matchesSearch =
      deferredSearch === '' ||
      item.name.toLowerCase().includes(deferredSearch) ||
      item.email.toLowerCase().includes(deferredSearch) ||
      (item.student_id || '').toLowerCase().includes(deferredSearch) ||
      (item.faculty_name || '').toLowerCase().includes(deferredSearch) ||
      (item.department_name || '').toLowerCase().includes(deferredSearch) ||
      (item.phone_number || '').toLowerCase().includes(deferredSearch);

    const matchesRole = roleFilter === 'all' || item.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && Boolean(item.is_active)) ||
      (statusFilter === 'inactive' && !item.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const setDraftField = <K extends keyof UserDraft>(key: K, value: UserDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const visibleDepartments = (response?.departments || []).filter(
    (department) =>
      draft.faculty_id === null || department.faculty_id === draft.faculty_id || department.faculty_id === null
  );

  const resetDraft = () => {
    setDraft({ ...emptyUserDraft });
  };

  const saveUser = async () => {
    if (!draft.name.trim() || !draft.email.trim() || !draft.student_id.trim()) {
      Alert.alert('Users', 'Name, email, and student or staff ID are required.');
      return;
    }

    if (!draft.user_id && draft.password.trim().length < 6) {
      Alert.alert('Users', 'New users need a password of at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      let result: SimpleSuccessResponse;

      if (draft.user_id) {
        result = await updateManagedUser(session, {
          admin_type: draft.admin_type || null,
          can_post_shorts: draft.role === 'admin' ? draft.can_post_shorts : false,
          department_id: draft.department_id,
          department_name: draft.department_id === null ? draft.department_name.trim() || null : null,
          email: draft.email.trim(),
          faculty_id: draft.faculty_id,
          is_active: draft.is_active,
          membership: draft.membership.trim() || null,
          name: draft.name.trim(),
          phone_number: draft.phone_number.trim() || null,
          role: draft.role,
          user_id: draft.user_id,
          year: draft.year,
        });
      } else {
        result = await createManagedUser(session, {
          admin_type: draft.admin_type || null,
          can_post_shorts: draft.role === 'admin' ? draft.can_post_shorts : false,
          department_id: draft.department_id,
          department_name: draft.department_id === null ? draft.department_name.trim() || null : null,
          email: draft.email.trim(),
          faculty_id: draft.faculty_id,
          membership: draft.membership.trim() || null,
          name: draft.name.trim(),
          password: draft.password,
          phone_number: draft.phone_number.trim() || null,
          role: draft.role,
          student_id: draft.student_id.trim(),
          year: draft.year,
        });
      }

      Alert.alert('Users', result.message || 'User saved successfully.');
      resetDraft();
      onDirty();
      await refresh();
    } catch (saveError) {
      Alert.alert('Users', getApiErrorMessage(saveError, 'Could not save that user.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteUser = (item: ManagedUserItem) => {
    Alert.alert('Delete user', `Delete ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true);
            try {
              const result = await deleteManagedUser(session, item.id);
              Alert.alert('Users', result.message || 'User deleted successfully.');
              onDirty();
              if (draft.user_id === item.id) {
                resetDraft();
              }
              await refresh();
            } catch (deleteError) {
              Alert.alert('Users', getApiErrorMessage(deleteError, 'Could not delete that user.'));
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <SectionIntro
        title="Manage all users"
        subtitle="Create, edit, filter, and remove accounts directly from the native admin app. Campus structure and login background controls now live under Customization."
      />

      {response ? (
        <View style={styles.metricGrid}>
          <MetricCard label="Users" value={response.stats.total_users} />
          <MetricCard label="Students" value={response.stats.total_students} />
          <MetricCard label="Admins" value={response.stats.total_admins} />
          <MetricCard label="Active" value={response.stats.active_users} />
          {response.stats.authorized_short_creators !== undefined ? (
            <MetricCard
              label="Short creators"
              value={response.stats.authorized_short_creators}
            />
          ) : null}
        </View>
      ) : null}

      <Panel>
        <Text style={styles.sectionTitle}>{draft.user_id ? 'Edit user' : 'Add new user'}</Text>
        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={draft.name} onChangeText={(value) => setDraftField('name', value)} />
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          value={draft.email}
          onChangeText={(value) => setDraftField('email', value)}
        />
        <Text style={styles.label}>Phone number</Text>
        <TextInput
          keyboardType="phone-pad"
          placeholder="+2547..."
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={draft.phone_number}
          onChangeText={(value) => setDraftField('phone_number', value)}
        />
        <Text style={styles.label}>Student or staff ID</Text>
        <TextInput
          editable={!draft.user_id}
          style={[styles.input, draft.user_id ? styles.inputMuted : null]}
          value={draft.student_id}
          onChangeText={(value) => setDraftField('student_id', value)}
        />
        {!draft.user_id ? (
          <>
            <Text style={styles.label}>Password</Text>
            <TextInput
              secureTextEntry
              style={styles.input}
              value={draft.password}
              onChangeText={(value) => setDraftField('password', value)}
            />
          </>
        ) : null}
        <Text style={styles.label}>Role</Text>
        <View style={styles.wrapRow}>
          {(['student', 'admin', 'super_admin'] as UserRole[]).map((roleOption) => (
            <ChoicePill
              key={roleOption}
              active={draft.role === roleOption}
              label={roleOption.replace('_', ' ')}
              onPress={() => setDraftField('role', roleOption)}
            />
          ))}
        </View>
        {draft.role === 'admin' ? (
          <>
            <Text style={styles.label}>Admin type</Text>
            <View style={styles.wrapRow}>
              {Object.entries(response?.admin_types || {}).map(([value, label]) => (
                <ChoicePill
                  key={value}
                  active={draft.admin_type === value}
                  label={label}
                  onPress={() => setDraftField('admin_type', value)}
                />
              ))}
            </View>
          </>
        ) : null}
        {draft.role === 'admin' ? (
          <>
            <ToggleRow
              label="Authorize shorts posting"
              onValueChange={(value) => setDraftField('can_post_shorts', value)}
              value={draft.can_post_shorts}
            />
            <Text style={styles.helperText}>
              Only super administrators can grant this. Authorized creators can upload shorts, and non-super-admin uploads still wait for review before they go live.
            </Text>
          </>
        ) : null}
        <Text style={styles.label}>Faculty</Text>
        <View style={styles.wrapRow}>
          <ChoicePill
            active={draft.faculty_id === null}
            label="Not set"
            onPress={() => {
              setDraftField('faculty_id', null);
              setDraftField('department_id', null);
            }}
          />
          {(response?.faculties || []).map((faculty) => (
            <ChoicePill
              key={faculty.id}
              active={draft.faculty_id === faculty.id}
              label={faculty.name}
              onPress={() => {
                setDraftField('faculty_id', faculty.id);
                setDraftField('department_id', null);
                setDraftField('department_name', '');
              }}
            />
          ))}
        </View>
        <Text style={styles.label}>Department</Text>
        <View style={styles.wrapRow}>
          <ChoicePill
            active={draft.department_id === null}
            label="Not set"
            onPress={() => setDraftField('department_id', null)}
          />
          {visibleDepartments.map((department) => (
            <ChoicePill
              key={department.id}
              active={draft.department_id === department.id}
              label={department.name}
              onPress={() => {
                setDraftField('department_id', department.id);
                setDraftField('department_name', department.name);
              }}
            />
          ))}
        </View>
        <TextInput
          placeholder="Or type a department name"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={draft.department_name}
          onChangeText={(value) => {
            setDraftField('department_name', value);
            if (value.trim() !== '') {
              setDraftField('department_id', null);
            }
          }}
        />
        <Text style={styles.helperText}>
          Need a brand-new department? Create it in the departments panel above first, then come back and assign it here.
        </Text>
        <Text style={styles.label}>Year</Text>
        <View style={styles.wrapRow}>
          <ChoicePill active={draft.year === null} label="Not set" onPress={() => setDraftField('year', null)} />
          {(response?.years || []).map((yearOption) => (
            <ChoicePill
              key={yearOption.value}
              active={draft.year === yearOption.value}
              label={yearOption.label}
              onPress={() => setDraftField('year', yearOption.value)}
            />
          ))}
        </View>
        <Text style={styles.label}>Membership</Text>
        <TextInput
          placeholder="Optional club or leadership role"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={draft.membership}
          onChangeText={(value) => setDraftField('membership', value)}
        />
        {draft.user_id ? (
          <ToggleRow label="Active account" onValueChange={(value) => setDraftField('is_active', value)} value={draft.is_active} />
        ) : null}
        <View style={styles.buttonRow}>
          <ActionButton
            disabled={saving}
            label={saving ? 'Saving...' : draft.user_id ? 'Save changes' : 'Add user'}
            onPress={() => void saveUser()}
            tone="accent"
          />
          {draft.user_id ? <ActionButton label="Cancel edit" onPress={resetDraft} tone="navy" /> : null}
        </View>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Find users</Text>
        <TextInput
          placeholder="Search by name, email, ID, or faculty"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={styles.label}>Role filter</Text>
        <View style={styles.wrapRow}>
          {(['all', 'student', 'admin', 'super_admin'] as const).map((item) => (
            <ChoicePill
              key={item}
              active={roleFilter === item}
              label={item === 'all' ? 'All roles' : item.replace('_', ' ')}
              onPress={() => setRoleFilter(item)}
            />
          ))}
        </View>
        <Text style={styles.label}>Status filter</Text>
        <View style={styles.wrapRow}>
          {(['all', 'active', 'inactive'] as const).map((item) => (
            <ChoicePill
              key={item}
              active={statusFilter === item}
              label={item === 'all' ? 'All statuses' : item}
              onPress={() => setStatusFilter(item)}
            />
          ))}
        </View>
      </Panel>

      {loading ? <LoadingState label="Loading users..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <Panel>
          <Text style={styles.sectionTitle}>User list</Text>
          {users.length === 0 ? (
            <Text style={styles.helperText}>No users matched the current filters.</Text>
          ) : (
            users.map((item) => (
              <View key={item.id} style={styles.listCard}>
                <View style={styles.inlineRowWrap}>
                  <Text style={styles.badge}>{item.role.replace('_', ' ').toUpperCase()}</Text>
                  <Text style={[styles.badge, item.is_active ? styles.badgeAccent : styles.badgeMuted]}>
                    {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                  {item.role === 'admin' && item.can_post_shorts ? (
                    <Text style={[styles.badge, styles.badgeWarm]}>SHORTS AUTHORIZED</Text>
                  ) : null}
                </View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.metaText}>{item.email}</Text>
                <Text style={styles.metaText}>
                  {item.student_id || 'No ID'} · {item.faculty_name || 'No faculty'} · {item.year ? `Year ${item.year}` : 'Year not set'}
                </Text>
                {item.department_name ? <Text style={styles.metaText}>Department: {item.department_name}</Text> : null}
                {item.phone_number ? <Text style={styles.metaText}>Phone: {item.phone_number}</Text> : null}
                {item.admin_type ? <Text style={styles.metaText}>Admin type: {item.admin_type}</Text> : null}
                {item.role === 'admin' && item.can_post_shorts ? (
                  <Text style={styles.metaText}>
                    Shorts posting approved{item.shorts_authorized_at ? ` · ${formatDateLabel(item.shorts_authorized_at)}` : ''}
                  </Text>
                ) : null}
                <Text style={styles.metaText}>Joined: {formatDateLabel(item.created_at)}</Text>
                <View style={styles.buttonRow}>
                  <ActionButton
                    label="Edit"
                    onPress={() => setDraft(formatUserDraft(item))}
                    tone="navy"
                  />
                  <ActionButton
                    disabled={saving}
                    label="Delete"
                    onPress={() => confirmDeleteUser(item)}
                    tone="danger"
                  />
                </View>
              </View>
            ))
          )}
        </Panel>
      ) : null}
    </ScrollView>
  );
}

export function CustomizationSection({ isActive, onDirty, refreshToken, session }: BaseProps) {
  const [response, setResponse] = useState<ManageUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facultyName, setFacultyName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [departmentFacultyId, setDepartmentFacultyId] = useState<number | null>(null);
  const [landingColor, setLandingColor] = useState('#17324D');
  const [landingBackgroundFile, setLandingBackgroundFile] = useState<UploadAsset | null>(null);

  const applyResponse = (next: ManageUsersResponse) => {
    setResponse(next);
    setLandingColor(next.landing_page?.background_color || '#17324D');
    setDepartmentFacultyId((current) => {
      if (current !== null && next.faculties.some((faculty) => faculty.id === current)) {
        return current;
      }

      return next.faculties[0]?.id ?? null;
    });
  };

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchManageUsers(session);
        if (isMounted) {
          applyResponse(next);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load customization right now.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [isActive, refreshToken, session]);

  const refresh = async () => {
    const next = await fetchManageUsers(session);
    applyResponse(next);
  };

  const departmentCatalogue = response?.departments || [];
  const landingPreviewUrl = landingBackgroundUrl(
    response?.landing_page?.background_image_url || null,
    response?.landing_page?.background_image || null
  );
  const facultyDepartmentCounts = departmentCatalogue.reduce<Record<number, number>>((counts, department) => {
    if (department.faculty_id) {
      counts[department.faculty_id] = (counts[department.faculty_id] || 0) + 1;
    }
    return counts;
  }, {});
  const visibleDepartmentCatalogue = departmentCatalogue.filter((department) =>
    departmentFacultyId === null ? true : department.faculty_id === departmentFacultyId
  );

  const saveFaculty = async () => {
    if (!facultyName.trim()) {
      Alert.alert('Customization', 'Enter a faculty name first.');
      return;
    }

    setSaving(true);
    try {
      const result = await createFaculty(session, { name: facultyName.trim() });
      Alert.alert('Customization', result.message || 'Faculty created successfully.');
      setFacultyName('');
      onDirty();
      await refresh();
    } catch (saveError) {
      Alert.alert('Customization', getApiErrorMessage(saveError, 'Could not create that faculty.'));
    } finally {
      setSaving(false);
    }
  };

  const saveDepartment = async () => {
    if (departmentFacultyId === null) {
      Alert.alert('Customization', 'Choose a faculty for this department.');
      return;
    }

    if (!departmentName.trim()) {
      Alert.alert('Customization', 'Enter a department name first.');
      return;
    }

    setSaving(true);
    try {
      const result = await createDepartment(session, {
        code: departmentCode.trim() || null,
        faculty_id: departmentFacultyId,
        name: departmentName.trim(),
      });
      Alert.alert('Customization', result.message || 'Department created successfully.');
      setDepartmentName('');
      setDepartmentCode('');
      onDirty();
      await refresh();
    } catch (saveError) {
      Alert.alert('Customization', getApiErrorMessage(saveError, 'Could not create that department.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteFaculty = (facultyId: number, name: string) => {
    Alert.alert('Delete faculty', `Delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true);
            try {
              const result = await deleteFaculty(session, facultyId);
              Alert.alert('Customization', result.message || 'Faculty deleted successfully.');
              onDirty();
              await refresh();
            } catch (deleteError) {
              Alert.alert('Customization', getApiErrorMessage(deleteError, 'Could not delete that faculty.'));
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  };

  const confirmDeleteDepartment = (departmentId: number, name: string) => {
    Alert.alert('Delete department', `Delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true);
            try {
              const result = await deleteDepartment(session, departmentId);
              Alert.alert('Customization', result.message || 'Department deleted successfully.');
              onDirty();
              await refresh();
            } catch (deleteError) {
              Alert.alert('Customization', getApiErrorMessage(deleteError, 'Could not delete that department.'));
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  };

  const pickLandingBackground = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: 'image/*',
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setLandingBackgroundFile({
        fileSize: asset.size,
        mimeType: asset.mimeType,
        name: asset.name,
        uri: asset.uri,
      });
    } catch (pickError) {
      Alert.alert('Login background', getApiErrorMessage(pickError, 'Could not pick that image.'));
    }
  };

  const uploadLoginBackground = async () => {
    if (!landingBackgroundFile) {
      Alert.alert('Login background', 'Choose an image first.');
      return;
    }

    setSaving(true);
    try {
      const result = await uploadLandingPageBackground(session, landingBackgroundFile);
      Alert.alert('Login background', result.message || 'Login background updated.');
      setLandingBackgroundFile(null);
      onDirty();
      await refresh();
    } catch (uploadError) {
      Alert.alert('Login background', getApiErrorMessage(uploadError, 'Could not upload that background image.'));
    } finally {
      setSaving(false);
    }
  };

  const saveLandingColor = async () => {
    if (!landingColor.trim()) {
      Alert.alert('Login background', 'Enter a fallback color such as #17324D.');
      return;
    }

    setSaving(true);
    try {
      const result = await updateLandingPageTheme(session, { background_color: landingColor.trim() });
      Alert.alert('Login background', result.message || 'Login background color updated.');
      onDirty();
      await refresh();
    } catch (themeError) {
      Alert.alert('Login background', getApiErrorMessage(themeError, 'Could not save that fallback color.'));
    } finally {
      setSaving(false);
    }
  };

  const clearLoginBackground = async () => {
    setSaving(true);
    try {
      const result = await clearLandingPageBackground(session);
      Alert.alert('Login background', result.message || 'Login background removed.');
      setLandingBackgroundFile(null);
      onDirty();
      await refresh();
    } catch (clearError) {
      Alert.alert('Login background', getApiErrorMessage(clearError, 'Could not remove that background image.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <SectionIntro
        title="Customization"
        subtitle="Manage campus structure and the login background picture from one place."
      />

      {response ? (
        <View style={styles.metricGrid}>
          {response.stats.total_faculties !== undefined ? (
            <MetricCard label="Faculties" value={response.stats.total_faculties} />
          ) : null}
          {response.stats.total_departments !== undefined ? (
            <MetricCard label="Departments" value={response.stats.total_departments} />
          ) : null}
          {response.stats.total_students !== undefined ? (
            <MetricCard label="Students" value={response.stats.total_students} />
          ) : null}
          {response.stats.students_missing_departments !== undefined ? (
            <MetricCard label="Missing dept" value={response.stats.students_missing_departments} />
          ) : null}
        </View>
      ) : null}

      {loading ? <LoadingState label="Loading customization..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && response ? (
        <>
          <Panel>
            <Text style={styles.sectionTitle}>Faculties</Text>
            <Text style={styles.bodyText}>
              Create or remove faculties before assigning users, notices, and departments to them.
            </Text>
            <Text style={styles.label}>New faculty name</Text>
            <TextInput
              placeholder="School of Informatics"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={facultyName}
              onChangeText={setFacultyName}
            />
            <ActionButton
              disabled={saving}
              label={saving ? 'Saving...' : 'Add faculty'}
              onPress={() => void saveFaculty()}
              tone="accent"
            />
            <View style={styles.catalogueGroup}>
              {response.faculties.length === 0 ? (
                <Text style={styles.helperText}>No faculties are configured yet.</Text>
              ) : (
                response.faculties.map((faculty) => (
                  <View key={faculty.id} style={styles.catalogueCard}>
                    <View style={styles.catalogueHeader}>
                      <View style={styles.catalogueTextWrap}>
                        <Text style={styles.cardTitle}>{faculty.name}</Text>
                        <Text style={styles.metaText}>
                          {facultyDepartmentCounts[faculty.id] || 0} department(s)
                        </Text>
                      </View>
                      <ActionButton
                        disabled={saving}
                        label="Delete"
                        onPress={() => confirmDeleteFaculty(faculty.id, faculty.name)}
                        tone="danger"
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          </Panel>

          <Panel>
            <Text style={styles.sectionTitle}>Departments</Text>
            <Text style={styles.bodyText}>
              Departments belong to a faculty and are used for user assignment and notice targeting.
            </Text>
            <Text style={styles.label}>Faculty</Text>
            <View style={styles.wrapRow}>
              {response.faculties.map((faculty) => (
                <ChoicePill
                  key={faculty.id}
                  active={departmentFacultyId === faculty.id}
                  label={faculty.name}
                  onPress={() => setDepartmentFacultyId(faculty.id)}
                />
              ))}
            </View>
            <Text style={styles.label}>Department name</Text>
            <TextInput
              placeholder="Accounts"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={departmentName}
              onChangeText={setDepartmentName}
            />
            <Text style={styles.label}>Department code</Text>
            <TextInput
              placeholder="ACC"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={departmentCode}
              onChangeText={setDepartmentCode}
            />
            <ActionButton
              disabled={saving || response.faculties.length === 0}
              label={saving ? 'Saving...' : 'Add department'}
              onPress={() => void saveDepartment()}
              tone="accent"
            />
            <View style={styles.catalogueGroup}>
              {visibleDepartmentCatalogue.length === 0 ? (
                <Text style={styles.helperText}>
                  {response.faculties.length === 0
                    ? 'Create a faculty first.'
                    : 'No departments are configured for the selected faculty yet.'}
                </Text>
              ) : (
                visibleDepartmentCatalogue.map((department) => (
                  <View key={department.id} style={styles.catalogueCard}>
                    <View style={styles.catalogueHeader}>
                      <View style={styles.catalogueTextWrap}>
                        <Text style={styles.cardTitle}>{department.name}</Text>
                        <Text style={styles.metaText}>
                          {department.faculty_name || 'No faculty'}
                          {department.code ? ` · ${department.code}` : ''}
                        </Text>
                      </View>
                      <ActionButton
                        disabled={saving}
                        label="Delete"
                        onPress={() => confirmDeleteDepartment(department.id, department.name)}
                        tone="danger"
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          </Panel>

          <Panel>
            <Text style={styles.sectionTitle}>Login branding</Text>
            <Text style={styles.bodyText}>
              This controls the background users see on the login screen.
            </Text>
            {landingPreviewUrl ? (
              <Image source={{ uri: landingPreviewUrl }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Text style={styles.helperText}>No custom login background picture uploaded yet.</Text>
              </View>
            )}
            <Pressable onPress={() => void pickLandingBackground()} style={styles.filePicker}>
              <Text style={styles.filePickerText}>
                {landingBackgroundFile
                  ? landingBackgroundFile.name
                  : response.landing_page.background_image || 'Choose login background image'}
              </Text>
            </Pressable>
            <View style={styles.buttonRow}>
              <ActionButton
                disabled={saving}
                label={saving ? 'Uploading...' : 'Upload picture'}
                onPress={() => void uploadLoginBackground()}
                tone="warm"
              />
              {response.landing_page.background_image ? (
                <ActionButton
                  disabled={saving}
                  label="Remove picture"
                  onPress={() => void clearLoginBackground()}
                  tone="danger"
                />
              ) : null}
            </View>
            <Text style={styles.label}>Fallback background color</Text>
            <TextInput
              autoCapitalize="characters"
              placeholder="#17324D"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={landingColor}
              onChangeText={setLandingColor}
            />
            <ActionButton
              disabled={saving}
              label={saving ? 'Saving...' : 'Save fallback color'}
              onPress={() => void saveLandingColor()}
              tone="navy"
            />
          </Panel>
        </>
      ) : null}
    </ScrollView>
  );
}

export function StudentSyncSection({ isActive, onDirty, refreshToken, session }: BaseProps) {
  const [info, setInfo] = useState<StudentSyncResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<UploadAsset | null>(null);
  const [latestResult, setLatestResult] = useState<StudentSyncResponse | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchStudentSyncInfo(session);
        if (isMounted) {
          setInfo(next);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load the student sync tool.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [isActive, refreshToken, session]);

  const pickCsv = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: '*/*',
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setPickedFile({
        mimeType: asset.mimeType || 'text/csv',
        name: asset.name,
        uri: asset.uri,
      });
    } catch (pickError) {
      Alert.alert('Student sync', getApiErrorMessage(pickError, 'Could not pick that CSV file.'));
    }
  };

  const uploadCsv = async () => {
    if (!pickedFile) {
      Alert.alert('Student sync', 'Choose a CSV file first.');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadStudentSyncFile(session, pickedFile);
      setLatestResult(result);
      Alert.alert('Student sync', result.message || 'Student records synced successfully.');
      setPickedFile(null);
      onDirty();
    } catch (uploadError) {
      Alert.alert('Student sync', getApiErrorMessage(uploadError, 'Could not sync the student CSV.'));
    } finally {
      setUploading(false);
    }
  };

  const visibleResult = latestResult || info;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <SectionIntro
        title="Student sync"
        subtitle="Upload registrar-style CSV files to update existing student accounts in bulk and backfill missing departments or phone numbers."
      />

      <Panel>
        <Text style={styles.sectionTitle}>Upload CSV</Text>
        <Text style={styles.bodyText}>
          This sync updates existing student profiles by student ID or email. It does not silently create new accounts for unmatched rows.
        </Text>
        <Pressable onPress={() => void pickCsv()} style={styles.filePicker}>
          <Text style={styles.filePickerText}>{pickedFile ? pickedFile.name : 'Choose CSV file'}</Text>
        </Pressable>
        <ActionButton
          disabled={uploading}
          label={uploading ? 'Uploading...' : 'Upload and sync'}
          onPress={() => void uploadCsv()}
          tone="accent"
        />
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Expected columns</Text>
        <Text style={styles.helperText}>{(info?.sample_columns || []).join(', ')}</Text>
      </Panel>

      {loading ? <LoadingState label="Loading sync details..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && visibleResult ? (
        <>
          <View style={styles.metricGrid}>
            <MetricCard label="Updated" value={visibleResult.updated} />
            <MetricCard label="Skipped" value={visibleResult.skipped} />
          </View>

          {visibleResult.backfill_summary ? (
            <>
              <Panel>
                <Text style={styles.sectionTitle}>Backfill status</Text>
                <Text style={styles.bodyText}>
                  Use the CSV sync to close the gaps below for already-registered students.
                </Text>
              </Panel>

              <View style={styles.metricGrid}>
                <MetricCard label="Students" value={visibleResult.backfill_summary.total_students} />
                <MetricCard label="Missing dept" value={visibleResult.backfill_summary.missing_departments} />
                <MetricCard label="Missing phone" value={visibleResult.backfill_summary.missing_phone_numbers} />
                <MetricCard label="Missing both" value={visibleResult.backfill_summary.missing_both} />
              </View>

              <Panel>
                <Text style={styles.sectionTitle}>Profiles still needing backfill</Text>
                {visibleResult.backfill_summary.samples.length === 0 ? (
                  <Text style={styles.helperText}>Everyone in scope already has both a department and phone number.</Text>
                ) : (
                  visibleResult.backfill_summary.samples.map((sample) => (
                    <Text key={sample.id} style={styles.issueText}>
                      • {sample.name} ({sample.student_id || sample.email}) {sample.faculty_name ? `· ${sample.faculty_name}` : ''}
                    </Text>
                  ))
                )}
              </Panel>
            </>
          ) : null}

          <Panel>
            <Text style={styles.sectionTitle}>Sync notes</Text>
            {visibleResult.issues.length === 0 ? (
              <Text style={styles.helperText}>No issues to report yet.</Text>
            ) : (
              visibleResult.issues.slice(0, 20).map((issue, index) => (
                <Text key={`${issue}-${index}`} style={styles.issueText}>
                  • {issue}
                </Text>
              ))
            )}
          </Panel>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#edf3f9',
    borderRadius: 999,
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeAccent: {
    backgroundColor: palette.accentSoft,
  },
  badgeMuted: {
    backgroundColor: '#edf3f9',
  },
  badgeWarm: {
    backgroundColor: palette.warmSoft,
  },
  bodyText: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  button: {
    alignItems: 'center',
    borderRadius: 14,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },
  catalogueCard: {
    backgroundColor: '#eef4fb',
    borderRadius: 18,
    marginTop: 12,
    padding: 16,
  },
  catalogueGroup: {
    marginTop: 12,
  },
  catalogueHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  catalogueTextWrap: {
    flex: 1,
  },
  choicePill: {
    backgroundColor: '#edf3f9',
    borderRadius: 999,
    marginRight: 8,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choicePillActive: {
    backgroundColor: palette.navy,
  },
  choiceText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  choiceTextActive: {
    color: '#ffffff',
  },
  errorCard: {
    backgroundColor: palette.dangerSoft,
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  filePicker: {
    backgroundColor: '#edf3f9',
    borderColor: palette.line,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  filePickerText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  headline: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: '900',
  },
  helperText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  helperTextMuted: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  inlineRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    backgroundColor: palette.bg,
    borderColor: palette.line,
    borderRadius: 16,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 15,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputMuted: {
    opacity: 0.65,
  },
  issueText: {
    color: palette.ink,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  listCard: {
    backgroundColor: '#eef4fb',
    borderRadius: 18,
    marginTop: 12,
    padding: 16,
  },
  metaText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  metricCard: {
    backgroundColor: '#edf3f9',
    borderRadius: 18,
    flex: 1,
    minWidth: 100,
    padding: 16,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricLabel: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: '900',
  },
  logoPreview: {
    borderRadius: 16,
    height: 72,
    width: 72,
  },
  logoPreviewCopy: {
    flex: 1,
  },
  logoPreviewRow: {
    alignItems: 'center',
    backgroundColor: '#eef4fb',
    borderColor: palette.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    padding: 14,
  },
  panel: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 18,
  },
  previewImage: {
    borderRadius: 18,
    height: 180,
    marginTop: 14,
    width: '100%',
  },
  previewPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#eef4fb',
    borderColor: palette.line,
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 140,
    padding: 18,
  },
  screen: {
    backgroundColor: palette.bg,
    gap: 14,
    paddingBottom: 48,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 24,
  },
  stateText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  toggleLabel: {
    color: palette.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
