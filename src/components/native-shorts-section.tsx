import * as ImagePicker from 'expo-image-picker';
import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import {
  createShort,
  CreateShortPayload,
  DepartmentOption,
  fetchShorts,
  getApiErrorMessage,
  runShortAction,
  ShortsResponse,
  shortVideoUrl,
  ShortItem,
  StoredUser,
  UploadAsset,
  UserRole,
  YearOption,
} from '@/config/api';

const palette = {
  accent: '#0f7b6c',
  accentSoft: '#dff8f2',
  bg: '#f4f7fb',
  card: '#ffffff',
  danger: '#d9485f',
  dangerSoft: '#ffe0e7',
  ink: '#10253c',
  line: '#d9e3ef',
  muted: '#60738a',
  navy: '#17324d',
  warm: '#ff8a5b',
  warmSoft: '#ffe8dd',
};

const MAX_SHORT_VIDEO_BYTES = 50 * 1024 * 1024;

interface ShortsSectionProps {
  isActive: boolean;
  onDirty: () => void;
  refreshToken: number;
  session: StoredUser;
}

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

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.stateText}>{body}</Text>
    </View>
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
  const backgrounds = {
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
        styles.actionButton,
        { backgroundColor: backgrounds[tone] },
        disabled ? styles.actionButtonDisabled : null,
      ]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
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
    <Pressable style={[styles.pill, active ? styles.pillActive : null]} onPress={onPress}>
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return 'Recently';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) {
    return null;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function targetSummary(short: ShortItem) {
  const scope = [];
  if (short.faculty_name) {
    scope.push(short.faculty_name);
  }
  if (short.department_name) {
    scope.push(short.department_name);
  }
  if (short.year_target) {
    scope.push(`Year ${short.year_target}`);
  }
  return scope.length > 0 ? scope.join(' · ') : 'Campus-wide';
}

function videoHtml(videoUrl: string) {
  const safeUrl = JSON.stringify(videoUrl);
  return `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      <style>
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          background: #08131f;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .wrap {
          display: flex;
          flex-direction: column;
          justify-content: center;
          height: 100%;
        }
        video {
          width: 100%;
          max-height: 100%;
          background: #000000;
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <video controls playsinline preload="metadata" src=${safeUrl}></video>
      </div>
    </body>
  </html>`;
}

export default function ShortsSection({ isActive, onDirty, refreshToken, session }: ShortsSectionProps) {
  const [response, setResponse] = useState<ShortsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<UploadAsset | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [selectedShort, setSelectedShort] = useState<ShortItem | null>(null);
  const [facultyTarget, setFacultyTarget] = useState<number | null>(session.role === 'admin' ? session.faculty_id || null : null);
  const [departmentTarget, setDepartmentTarget] = useState<number | null>(null);
  const [yearTarget, setYearTarget] = useState<number | null>(null);
  const [selectedAudienceRoles, setSelectedAudienceRoles] = useState<UserRole[]>([]);
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
        const next = await fetchShorts(session);
        if (isMounted) {
          setResponse(next);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load shorts right now.'));
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

  const visibleDepartments = useMemo(
    () =>
      (response?.departments || []).filter(
        (department) =>
          facultyTarget === null || department.faculty_id === facultyTarget || department.faculty_id === null
      ),
    [facultyTarget, response?.departments]
  );

  useEffect(() => {
    if (departmentTarget === null) {
      return;
    }

    const stillVisible = visibleDepartments.some((department) => department.id === departmentTarget);
    if (!stillVisible) {
      setDepartmentTarget(null);
    }
  }, [departmentTarget, visibleDepartments]);

  const filteredShorts = (response?.shorts || []).filter((short) => {
    if (deferredSearch === '') {
      return true;
    }

    return (
      (short.title || '').toLowerCase().includes(deferredSearch) ||
      short.caption.toLowerCase().includes(deferredSearch) ||
      (short.author_name || '').toLowerCase().includes(deferredSearch) ||
      (short.department_name || '').toLowerCase().includes(deferredSearch)
    );
  });

  const pickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Shorts', 'Permission to access your media library is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['videos'],
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const durationMs = asset.duration ?? null;
      if (!durationMs || durationMs <= 0) {
        Alert.alert('Shorts', 'Please choose a video whose duration can be read by the app.');
        return;
      }

      const seconds = Math.ceil(durationMs / 1000);
      if (seconds > 60) {
        Alert.alert('Shorts', 'Short videos must be 60 seconds or less.');
        return;
      }

      const fileSize = asset.fileSize ?? null;
      if (fileSize && fileSize > MAX_SHORT_VIDEO_BYTES) {
        Alert.alert(
          'Shorts',
          'Please choose a shorter or more compressed video. For reliable uploads, keep shorts under 50 MB.'
        );
        return;
      }

      setSelectedVideo({
        fileSize,
        mimeType: asset.mimeType || 'video/mp4',
        name: asset.fileName || `short-${Date.now()}.mp4`,
        uri: asset.uri,
      });
      setDurationSeconds(seconds);
    } catch (pickError) {
      Alert.alert('Shorts', getApiErrorMessage(pickError, 'Could not choose that video.'));
    }
  };

  const resetComposer = () => {
    setTitle('');
    setCaption('');
    setSelectedVideo(null);
    setDurationSeconds(null);
    setDepartmentTarget(null);
    setSelectedAudienceRoles([]);
    setYearTarget(null);
    if (session.role !== 'admin') {
      setFacultyTarget(null);
    }
  };

  const submitShort = async () => {
    if (!selectedVideo || !durationSeconds) {
      Alert.alert('Shorts', 'Choose a video before posting.');
      return;
    }

    if (!title.trim() && !caption.trim()) {
      Alert.alert('Shorts', 'Add a title or caption before posting.');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateShortPayload = {
        audience_roles: selectedAudienceRoles,
        caption: caption.trim(),
        department_target: departmentTarget,
        duration_seconds: durationSeconds,
        faculty_target: facultyTarget,
        title: title.trim() || null,
        video: selectedVideo,
        year_target: yearTarget,
      };

      const result = await createShort(session, payload);
      Alert.alert('Shorts', result.message || 'Short posted successfully.');
      resetComposer();
      onDirty();
      const refreshed = await fetchShorts(session);
      setResponse(refreshed);
    } catch (saveError) {
      Alert.alert('Shorts', getApiErrorMessage(saveError, 'Could not post that short.'));
    } finally {
      setSaving(false);
    }
  };

  const openShort = async (short: ShortItem) => {
    setSelectedShort(short);

    if (!short.has_viewed) {
      try {
        await runShortAction(session, {
          action: 'view',
          short_id: short.id,
        });
        setResponse((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            shorts: current.shorts.map((item) =>
              item.id === short.id
                ? {
                    ...item,
                    has_viewed: 1,
                    view_count: (item.view_count || 0) + 1,
                  }
                : item
            ),
          };
        });
      } catch {
        // A view metric should never block playback.
      }
    }
  };

  const confirmDelete = (short: ShortItem) => {
    Alert.alert('Delete short', 'This will remove the short from every viewer feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: () => void deleteShort(short.id),
      },
    ]);
  };

  const deleteShort = async (shortId: number) => {
    try {
      const result = await runShortAction(session, {
        action: 'delete',
        short_id: shortId,
      });
      Alert.alert('Shorts', result.message || 'Short deleted successfully.');
      setSelectedShort((current) => (current?.id === shortId ? null : current));
      onDirty();
      const refreshed = await fetchShorts(session);
      setResponse(refreshed);
    } catch (deleteError) {
      Alert.alert('Shorts', getApiErrorMessage(deleteError, 'Could not delete that short.'));
    }
  };

  const scopeLocked = response?.student_scope_locked || session.role === 'student';
  const audienceRoles = response?.audience_roles || {};
  const years = response?.years || [];

  return (
    <>
      <ScrollView contentContainerStyle={styles.screen}>
        <SectionIntro
          title="Shorts"
          subtitle="Quick campus video updates for the right faculty, department, year, and role."
        />

        <Panel>
          <Text style={styles.sectionTitle}>Post a short</Text>
          <Text style={styles.helperText}>
            Keep videos at 60 seconds or less. Your upload becomes visible to the audience you target here.
          </Text>
          {scopeLocked ? (
            <View style={styles.scopeNotice}>
              <Text style={styles.scopeNoticeText}>
                Student uploads are automatically limited to students in your current faculty, department, and year profile.
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>Title</Text>
          <TextInput
            placeholder="Optional short headline"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Caption</Text>
          <TextInput
            multiline
            placeholder="What should viewers know?"
            placeholderTextColor={palette.muted}
            style={[styles.input, styles.textArea]}
            value={caption}
            onChangeText={setCaption}
          />

          {!scopeLocked ? (
            <>
              <Text style={styles.label}>Target faculty</Text>
              <View style={styles.wrapRow}>
                <ChoicePill
                  active={facultyTarget === null}
                  label="All faculties"
                  onPress={() => {
                    setFacultyTarget(null);
                    setDepartmentTarget(null);
                  }}
                />
                {(response?.faculties || []).map((faculty) => (
                  <ChoicePill
                    key={faculty.id}
                    active={facultyTarget === faculty.id}
                    label={faculty.name}
                    onPress={() => {
                      setFacultyTarget(faculty.id);
                      setDepartmentTarget(null);
                    }}
                  />
                ))}
              </View>

              <Text style={styles.label}>Target department</Text>
              <View style={styles.wrapRow}>
                <ChoicePill
                  active={departmentTarget === null}
                  label="All departments"
                  onPress={() => setDepartmentTarget(null)}
                />
                {visibleDepartments.map((department: DepartmentOption) => (
                  <ChoicePill
                    key={department.id}
                    active={departmentTarget === department.id}
                    label={department.name}
                    onPress={() => setDepartmentTarget(department.id)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Target year</Text>
              <View style={styles.wrapRow}>
                <ChoicePill active={yearTarget === null} label="All years" onPress={() => setYearTarget(null)} />
                {years.map((yearOption: YearOption) => (
                  <ChoicePill
                    key={yearOption.value}
                    active={yearTarget === yearOption.value}
                    label={yearOption.label}
                    onPress={() => setYearTarget(yearOption.value)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Target roles</Text>
              <View style={styles.wrapRow}>
                <ChoicePill
                  active={selectedAudienceRoles.length === 0}
                  label="All roles"
                  onPress={() => setSelectedAudienceRoles([])}
                />
                {Object.entries(audienceRoles).map(([role, label]) => (
                  <ChoicePill
                    key={role}
                    active={selectedAudienceRoles.includes(role as UserRole)}
                    label={label}
                    onPress={() => {
                      const nextRole = role as UserRole;
                      setSelectedAudienceRoles((current) =>
                        current.includes(nextRole)
                          ? current.filter((item) => item !== nextRole)
                          : [...current, nextRole]
                      );
                    }}
                  />
                ))}
              </View>
            </>
          ) : null}

          <Pressable onPress={() => void pickVideo()} style={styles.filePicker}>
            <Text style={styles.filePickerText}>
              {selectedVideo
                ? `${selectedVideo.name} · ${durationSeconds || 0}s${selectedVideo.fileSize ? ` · ${formatFileSize(selectedVideo.fileSize)}` : ''}`
                : 'Choose a video from your library'}
            </Text>
          </Pressable>

          <View style={styles.actionRow}>
            <ActionButton
              disabled={saving}
              label={saving ? 'Posting...' : 'Post short'}
              onPress={() => void submitShort()}
              tone="accent"
            />
            {selectedVideo ? (
              <ActionButton
                label="Clear"
                onPress={resetComposer}
                tone="navy"
              />
            ) : null}
          </View>
        </Panel>

        <Panel>
          <Text style={styles.sectionTitle}>Browse shorts</Text>
          <TextInput
            placeholder="Search by title, caption, or creator"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={search}
            onChangeText={setSearch}
          />
        </Panel>

        {loading ? <LoadingState label="Loading campus shorts..." /> : null}
        {error ? <ErrorState message={error} /> : null}

        {!loading && !error && filteredShorts.length === 0 ? (
          <EmptyState
            title="No shorts yet"
            body="The first short someone posts for your audience will show up here."
          />
        ) : null}

        {!loading && !error
          ? filteredShorts.map((short) => (
              <Panel key={short.id}>
                <View style={styles.shortPreview}>
                  <Text style={styles.previewKicker}>Campus short · {short.duration_seconds}s</Text>
                  <Text style={styles.previewTitle}>{short.title?.trim() || 'Campus short'}</Text>
                  <Text style={styles.previewBody} numberOfLines={4}>
                    {short.caption}
                  </Text>
                </View>
                <Text style={styles.metaText}>
                  {short.author_name || 'Campus user'} · {formatDateLabel(short.created_at)}
                </Text>
                <Text style={styles.metaText}>
                  Audience: {targetSummary(short)}
                  {short.audience_roles_csv ? ` · ${short.audience_roles_csv}` : ''}
                </Text>
                <Text style={styles.metaText}>
                  {short.view_count || 0} views {short.has_viewed ? '· Viewed' : ''}
                </Text>
                <View style={styles.actionRow}>
                  <ActionButton label="Play" onPress={() => void openShort(short)} tone="accent" />
                  {short.can_manage ? (
                    <ActionButton label="Delete" onPress={() => confirmDelete(short)} tone="danger" />
                  ) : null}
                </View>
              </Panel>
            ))
          : null}
      </ScrollView>

      <Modal animationType="slide" transparent visible={!!selectedShort} onRequestClose={() => setSelectedShort(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedShort?.title?.trim() || 'Campus short'}</Text>
            <Text style={styles.modalMeta}>
              {selectedShort?.author_name || 'Campus user'} · {selectedShort ? formatDateLabel(selectedShort.created_at) : ''}
            </Text>
            {selectedShort ? (
              <View style={styles.playerShell}>
                <WebView
                  originWhitelist={['*']}
                  source={{ html: videoHtml(shortVideoUrl(selectedShort.video_filename) || '') }}
                  style={styles.player}
                />
              </View>
            ) : null}
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalBody}>{selectedShort?.caption || ''}</Text>
              {selectedShort ? (
                <Text style={styles.helperText}>Audience: {targetSummary(selectedShort)}</Text>
              ) : null}
            </ScrollView>
            <View style={styles.actionRow}>
              {selectedShort?.can_manage ? (
                <ActionButton
                  label="Delete"
                  onPress={() => {
                    const currentId = selectedShort.id;
                    setSelectedShort(null);
                    confirmDelete({ ...selectedShort, id: currentId });
                  }}
                  tone="danger"
                />
              ) : null}
              <ActionButton label="Close" onPress={() => setSelectedShort(null)} tone="navy" />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 999,
    minWidth: 108,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  errorCard: {
    borderColor: palette.danger,
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  filePicker: {
    backgroundColor: '#eef4fb',
    borderColor: palette.line,
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 10,
    padding: 16,
  },
  filePickerText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  headline: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: '800',
  },
  helperText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    backgroundColor: '#f9fbfd',
    borderColor: palette.line,
    borderRadius: 16,
    borderWidth: 1,
    color: palette.ink,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  metaText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(7, 18, 28, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  modalBody: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 23,
  },
  modalCard: {
    backgroundColor: palette.card,
    borderRadius: 28,
    maxHeight: '92%',
    padding: 18,
  },
  modalMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  modalScroll: {
    marginTop: 14,
    maxHeight: 180,
  },
  modalTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  panel: {
    backgroundColor: palette.card,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#10253c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  pill: {
    backgroundColor: '#eef4fb',
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pillActive: {
    backgroundColor: palette.navy,
    borderColor: palette.navy,
  },
  pillText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  player: {
    backgroundColor: '#08131f',
    borderRadius: 20,
    overflow: 'hidden',
  },
  playerShell: {
    backgroundColor: '#08131f',
    borderRadius: 20,
    height: 260,
    marginTop: 14,
    overflow: 'hidden',
  },
  previewBody: {
    color: '#eaf3ff',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  previewKicker: {
    color: '#a9c2d8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  previewTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },
  scopeNotice: {
    backgroundColor: palette.accentSoft,
    borderRadius: 18,
    marginTop: 12,
    padding: 14,
  },
  scopeNoticeText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  screen: {
    backgroundColor: palette.bg,
    gap: 16,
    padding: 18,
    paddingBottom: 42,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  shortPreview: {
    backgroundColor: palette.navy,
    borderRadius: 22,
    padding: 18,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  stateText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
});
