import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  navyDeep: '#0b1826',
  navySoft: '#17324dcc',
  warm: '#ff8a5b',
};

const MAX_SHORT_VIDEO_BYTES = 50 * 1024 * 1024;

interface ShortsSectionProps {
  isActive: boolean;
  onDirty: () => void;
  refreshToken: number;
  session: StoredUser;
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
    <Pressable onPress={onPress} style={[styles.pill, active ? styles.pillActive : null]}>
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{label}</Text>
    </Pressable>
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

function ErrorState({ message }: { message: string }) {
  return (
    <View style={[styles.stateCard, styles.errorCard]}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
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

function videoHtml(
  videoUrl: string,
  options?: {
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    muted?: boolean;
  }
) {
  const safeUrl = JSON.stringify(videoUrl);
  const attrs = [
    options?.autoplay ? 'autoplay' : '',
    options?.controls ? 'controls' : '',
    options?.loop ? 'loop' : '',
    options?.muted ? 'muted' : '',
    'playsinline',
    'preload="metadata"',
  ]
    .filter(Boolean)
    .join(' ');

  return `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      <style>
        html, body { margin: 0; padding: 0; height: 100%; background: #08131f; color: #ffffff; overflow: hidden; }
        .wrap { display: flex; height: 100%; justify-content: center; align-items: center; }
        video { width: 100%; height: 100%; object-fit: cover; background: #000000; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <video ${attrs} src=${safeUrl}></video>
      </div>
    </body>
  </html>`;
}

export default function ShortsSection({ isActive, onDirty, refreshToken, session }: ShortsSectionProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [response, setResponse] = useState<ShortsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<UploadAsset | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [selectedShort, setSelectedShort] = useState<ShortItem | null>(null);
  const [activeShortId, setActiveShortId] = useState<number | null>(null);
  const [moderatingShortId, setModeratingShortId] = useState<number | null>(null);
  const [facultyTarget, setFacultyTarget] = useState<number | null>(
    session.role === 'admin' ? session.faculty_id || null : null
  );
  const [departmentTarget, setDepartmentTarget] = useState<number | null>(null);
  const [yearTarget, setYearTarget] = useState<number | null>(null);
  const [selectedAudienceRoles, setSelectedAudienceRoles] = useState<UserRole[]>([]);
  const feedCardHeight = Math.max(420, height - 250);

  const viewabilityConfigCallbackPairs = useRef([
    {
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
        const firstVisible = viewableItems.find((item) => item.isViewable)?.item as ShortItem | undefined;
        if (firstVisible?.id) {
          setActiveShortId(firstVisible.id);
        }
      },
      viewabilityConfig: {
        itemVisiblePercentThreshold: 70,
      },
    },
  ]);

  const applyResponse = (next: ShortsResponse) => {
    setResponse(next);
    setActiveShortId((current) => {
      if (current && next.shorts.some((short) => short.id === current)) {
        return current;
      }
      return next.shorts[0]?.id ?? null;
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
        const next = await fetchShorts(session);
        if (isMounted) {
          applyResponse(next);
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

  useEffect(() => {
    if (composerVisible && response?.permissions && !response.permissions.can_post) {
      setComposerVisible(false);
    }
  }, [composerVisible, response?.permissions]);

  useEffect(() => {
    if (reviewVisible && response?.permissions && !response.permissions.can_review) {
      setReviewVisible(false);
    }
  }, [reviewVisible, response?.permissions]);

  useEffect(() => {
    if (reviewVisible && (response?.pending_shorts?.length || 0) === 0) {
      setReviewVisible(false);
    }
  }, [reviewVisible, response?.pending_shorts]);

  const refreshShorts = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const next = await fetchShorts(session);
      applyResponse(next);
    } catch (refreshError) {
      setError(getApiErrorMessage(refreshError, 'Could not refresh shorts right now.'));
    } finally {
      setRefreshing(false);
    }
  };

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

  const openComposer = () => {
    if (!response?.permissions?.can_post) {
      Alert.alert(
        'Shorts',
        'Only creators authorized by a super administrator can upload shorts from the app.'
      );
      return;
    }

    setComposerVisible(true);
  };

  const submitShort = async () => {
    if (!response?.permissions?.can_post) {
      Alert.alert(
        'Shorts',
        'Your account is not authorized to upload shorts yet. Please contact a super administrator.'
      );
      return;
    }

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
      setComposerVisible(false);
      onDirty();
      const refreshed = await fetchShorts(session);
      applyResponse(refreshed);
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
        // View metrics should never block playback.
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
      applyResponse(refreshed);
    } catch (deleteError) {
      Alert.alert('Shorts', getApiErrorMessage(deleteError, 'Could not delete that short.'));
    }
  };

  const moderateShort = async (short: ShortItem, action: 'approve' | 'reject') => {
    setModeratingShortId(short.id);
    try {
      const result = await runShortAction(session, {
        action,
        short_id: short.id,
      });
      Alert.alert('Shorts', result.message || (action === 'approve' ? 'Short approved.' : 'Short rejected.'));
      setSelectedShort((current) => (current?.id === short.id ? null : current));
      onDirty();
      const refreshed = await fetchShorts(session);
      applyResponse(refreshed);
    } catch (moderateError) {
      Alert.alert(
        'Shorts',
        getApiErrorMessage(
          moderateError,
          action === 'approve' ? 'Could not approve that short.' : 'Could not reject that short.'
        )
      );
    } finally {
      setModeratingShortId(null);
    }
  };

  const confirmModeration = (short: ShortItem, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? 'Approve short' : 'Reject short',
      action === 'approve'
        ? 'This short will become visible to its full target audience.'
        : 'This short will be removed from the pending review queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: () => void moderateShort(short, action),
        },
      ]
    );
  };

  const permissions = response?.permissions;
  const isStudentViewer = session.role === 'student';
  const canPostShorts = !isStudentViewer && Boolean(permissions?.can_post);
  const canReviewShorts = Boolean(permissions?.can_review);
  const feedIsSuperAdminOnly = Boolean(permissions?.feed_is_super_admin_only);
  const moderationSummary = response?.moderation_summary;
  const pendingShorts = response?.pending_shorts || [];
  const scopeLocked = response?.student_scope_locked || session.role === 'student';
  const audienceRoles = response?.audience_roles || {};
  const years = response?.years || [];
  const shorts = response?.shorts || [];
  const emptyFeedMessage = feedIsSuperAdminOnly
    ? 'Only official shorts from the super admin are available to you right now.'
    : 'When someone posts a campus short for your audience, it will show up here.';
  const reviewerPendingCount = moderationSummary?.pending_review ?? pendingShorts.length;
  const shouldShowPendingReviewNote = canPostShorts && session.role !== 'super_admin';

  if (loading && !response) {
    return (
      <View style={styles.screenState}>
        <LoadingState label="Loading campus shorts..." />
      </View>
    );
  }

  if (error && !response) {
    return (
      <View style={styles.screenState}>
        <ErrorState message={error} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : null}

        <FlatList
          contentContainerStyle={[
            styles.feedContent,
            {
              paddingBottom: 120 + insets.bottom,
              paddingTop: 12,
            },
          ]}
          data={shorts}
          decelerationRate="fast"
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
            !canPostShorts || shouldShowPendingReviewNote || canReviewShorts ? (
              <View style={styles.infoStack}>
                {!canPostShorts ? (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>{isStudentViewer ? 'Student feed only' : 'Official shorts only'}</Text>
                    <Text style={styles.infoBody}>
                      {isStudentViewer
                        ? 'Student accounts can watch shorts, but only super admins and authorized admins can upload them.'
                        : 'Only creators approved by a super administrator can upload shorts. Until then, your feed stays limited to official super-admin posts.'}
                    </Text>
                  </View>
                ) : null}

                {shouldShowPendingReviewNote ? (
                  <View style={[styles.infoCard, styles.infoCardAccent]}>
                    <Text style={styles.infoTitle}>Uploads need review</Text>
                    <Text style={styles.infoBody}>
                      Your account is cleared to post, but non-super-admin shorts still wait for approval before the full audience can see them.
                    </Text>
                  </View>
                ) : null}

                {canReviewShorts ? (
                  <View style={[styles.infoCard, styles.infoCardWarm]}>
                    <Text style={styles.infoTitle}>Review queue</Text>
                    <Text style={styles.infoBody}>
                      {reviewerPendingCount} pending · {moderationSummary?.published || 0} published ·{' '}
                      {moderationSummary?.rejected || 0} rejected
                    </Text>
                    <View style={styles.infoActionRow}>
                      <ActionButton
                        label={pendingShorts.length > 0 ? `Review pending (${pendingShorts.length})` : 'No pending shorts'}
                        onPress={() => setReviewVisible(true)}
                        tone="navy"
                        disabled={pendingShorts.length === 0}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="No shorts yet"
              body={emptyFeedMessage}
            />
          }
          onRefresh={() => void refreshShorts()}
          pagingEnabled
          refreshing={refreshing}
          renderItem={({ item }) => {
            const isActiveShort = item.id === activeShortId;
            const videoUrl = shortVideoUrl(item.video_filename) || '';

            return (
              <View style={[styles.feedCard, { minHeight: feedCardHeight }]}>
                <View style={styles.videoFrame}>
                  {videoUrl ? (
                    <WebView
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={false}
                      originWhitelist={['*']}
                      pointerEvents="none"
                      source={{
                        html: videoHtml(videoUrl, {
                          autoplay: isActiveShort,
                          controls: false,
                          loop: true,
                          muted: true,
                        }),
                      }}
                      style={styles.feedPlayer}
                    />
                  ) : (
                    <View style={styles.videoFallback}>
                      <Text style={styles.videoFallbackText}>Video preview unavailable</Text>
                    </View>
                  )}

                  <View style={styles.videoShade} />

                  <View style={styles.feedTopRow}>
                    <View style={styles.durationChip}>
                      <Text style={styles.durationChipText}>{item.duration_seconds}s</Text>
                    </View>
                    <Text style={styles.viewsText}>{item.view_count || 0} views</Text>
                  </View>

                  <View style={styles.feedBottom}>
                    <Text numberOfLines={2} style={styles.feedTitle}>
                      {item.title?.trim() || 'Campus short'}
                    </Text>
                    <Text numberOfLines={3} style={styles.feedCaption}>
                      {item.caption}
                    </Text>
                    <Text numberOfLines={2} style={styles.feedMeta}>
                      {item.author_name || 'Campus user'} · {formatDateLabel(item.created_at)}
                    </Text>
                    <Text numberOfLines={2} style={styles.feedMeta}>
                      Audience: {targetSummary(item)}
                    </Text>
                    {item.status && item.status !== 'published' ? (
                      <Text numberOfLines={1} style={styles.feedStatus}>
                        Status: {item.status.replace(/_/g, ' ')}
                      </Text>
                    ) : null}

                    <View style={styles.feedActionRow}>
                      <ActionButton label="Watch" onPress={() => void openShort(item)} tone="accent" />
                      {item.can_review && item.status === 'pending_review' ? (
                        <ActionButton
                          label="Review"
                          onPress={() => {
                            setReviewVisible(false);
                            void openShort(item);
                          }}
                          tone="warm"
                        />
                      ) : null}
                      {item.can_manage ? (
                        <ActionButton label="Delete" onPress={() => confirmDelete(item)} tone="danger" />
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current as any}
        />

        {canPostShorts ? (
          <Pressable
            onPress={openComposer}
            style={[styles.fab, { bottom: 22 + insets.bottom }]}
          >
            <Text style={styles.fabPlus}>+</Text>
            <Text style={styles.fabLabel}>Post</Text>
          </Pressable>
        ) : null}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setComposerVisible(false)}
        transparent
        visible={composerVisible}
      >
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Post a short</Text>
                <Text style={styles.sheetSubtitle}>Upload first, then fine-tune the audience if you need to.</Text>
              </View>
              <Pressable onPress={() => setComposerVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              {scopeLocked ? (
                <View style={styles.scopeNotice}>
                  <Text style={styles.scopeNoticeText}>
                    Student uploads are automatically limited to students in your current faculty, department, and year profile.
                  </Text>
                </View>
              ) : null}

              <Text style={styles.label}>Title</Text>
              <TextInput
                onChangeText={setTitle}
                placeholder="Optional short headline"
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={title}
              />

              <Text style={styles.label}>Caption</Text>
              <TextInput
                multiline
                onChangeText={setCaption}
                placeholder="What should viewers know?"
                placeholderTextColor={palette.muted}
                style={[styles.input, styles.textArea]}
                value={caption}
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
                        active={facultyTarget === faculty.id}
                        key={faculty.id}
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
                        active={departmentTarget === department.id}
                        key={department.id}
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
                        active={yearTarget === yearOption.value}
                        key={yearOption.value}
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
                        active={selectedAudienceRoles.includes(role as UserRole)}
                        key={role}
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

              <Text style={styles.label}>Video</Text>
              <Pressable onPress={() => void pickVideo()} style={styles.filePicker}>
                <Text style={styles.filePickerText}>
                  {selectedVideo
                    ? `${selectedVideo.name} · ${durationSeconds || 0}s${selectedVideo.fileSize ? ` · ${formatFileSize(selectedVideo.fileSize)}` : ''}`
                    : 'Choose a video from your library'}
                </Text>
              </Pressable>

              <View style={styles.sheetActions}>
                <ActionButton
                  disabled={saving}
                  label={saving ? 'Posting...' : 'Upload short'}
                  onPress={() => void submitShort()}
                  tone="accent"
                />
                {selectedVideo || title || caption ? (
                  <ActionButton label="Reset" onPress={resetComposer} tone="navy" />
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={reviewVisible} onRequestClose={() => setReviewVisible(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Review pending shorts</Text>
                <Text style={styles.sheetSubtitle}>
                  Approve or reject uploads before they reach their full audience.
                </Text>
              </View>
              <Pressable onPress={() => setReviewVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              {pendingShorts.length === 0 ? (
                <EmptyState title="Nothing waiting" body="There are no shorts waiting for review right now." />
              ) : (
                pendingShorts.map((short) => (
                  <View key={short.id} style={styles.reviewCard}>
                    <View style={styles.inlineBadgeRow}>
                      <Text style={styles.reviewBadge}>PENDING</Text>
                      {short.department_name ? <Text style={styles.reviewBadge}>{short.department_name}</Text> : null}
                    </View>
                    <Text style={styles.reviewTitle}>{short.title?.trim() || 'Campus short'}</Text>
                    <Text style={styles.reviewMeta}>
                      {short.author_name || 'Campus user'} · {formatDateLabel(short.created_at)}
                    </Text>
                    <Text style={styles.reviewBody}>{short.caption}</Text>
                    <Text style={styles.reviewMeta}>Audience: {targetSummary(short)}</Text>
                    <View style={styles.reviewActionRow}>
                      <ActionButton
                        label="Preview"
                        onPress={() => {
                          setReviewVisible(false);
                          void openShort(short);
                        }}
                        tone="navy"
                      />
                      <ActionButton
                        disabled={moderatingShortId === short.id}
                        label={moderatingShortId === short.id ? 'Approving...' : 'Approve'}
                        onPress={() => confirmModeration(short, 'approve')}
                        tone="accent"
                      />
                      <ActionButton
                        disabled={moderatingShortId === short.id}
                        label={moderatingShortId === short.id ? 'Working...' : 'Reject'}
                        onPress={() => confirmModeration(short, 'reject')}
                        tone="danger"
                      />
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={!!selectedShort} onRequestClose={() => setSelectedShort(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedShort?.title?.trim() || 'Campus short'}</Text>
            <Text style={styles.modalMeta}>
              {selectedShort?.author_name || 'Campus user'} ·{' '}
              {selectedShort ? formatDateLabel(selectedShort.created_at) : ''}
            </Text>
            {selectedShort ? (
              <View style={styles.playerShell}>
                <WebView
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  originWhitelist={['*']}
                  source={{
                    html: videoHtml(shortVideoUrl(selectedShort.video_filename) || '', {
                      autoplay: false,
                      controls: true,
                      loop: false,
                      muted: false,
                    }),
                  }}
                  style={styles.player}
                />
              </View>
            ) : null}
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalBody}>{selectedShort?.caption || ''}</Text>
              {selectedShort ? (
                <Text style={styles.helperText}>Audience: {targetSummary(selectedShort)}</Text>
              ) : null}
              {selectedShort?.status && selectedShort.status !== 'published' ? (
                <Text style={styles.helperText}>Status: {selectedShort.status.replace(/_/g, ' ')}</Text>
              ) : null}
            </ScrollView>
            <View style={styles.feedActionRow}>
              {selectedShort?.can_review && selectedShort.status === 'pending_review' ? (
                <>
                  <ActionButton
                    disabled={moderatingShortId === selectedShort.id}
                    label={moderatingShortId === selectedShort.id ? 'Approving...' : 'Approve'}
                    onPress={() => confirmModeration(selectedShort, 'approve')}
                    tone="accent"
                  />
                  <ActionButton
                    disabled={moderatingShortId === selectedShort.id}
                    label={moderatingShortId === selectedShort.id ? 'Working...' : 'Reject'}
                    onPress={() => confirmModeration(selectedShort, 'reject')}
                    tone="danger"
                  />
                </>
              ) : null}
              {selectedShort?.can_manage ? (
                <ActionButton
                  label="Delete"
                  onPress={() => {
                    const short = selectedShort;
                    setSelectedShort(null);
                    confirmDelete(short);
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
    minWidth: 110,
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
  banner: {
    backgroundColor: palette.dangerSoft,
    borderBottomColor: '#f8c1cb',
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  bannerText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeButton: {
    backgroundColor: '#eef4fb',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeButtonText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    backgroundColor: palette.bg,
    flex: 1,
  },
  durationChip: {
    backgroundColor: 'rgba(15, 123, 108, 0.88)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  durationChipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
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
  fab: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: palette.warm,
    borderRadius: 999,
    elevation: 4,
    justifyContent: 'center',
    minHeight: 64,
    minWidth: 64,
    paddingHorizontal: 18,
    position: 'absolute',
    right: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  fabLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: -2,
  },
  fabPlus: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  feedStatus: {
    color: '#ffe3a6',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  feedActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  feedBottom: {
    bottom: 0,
    left: 0,
    padding: 18,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
  feedCaption: {
    color: '#f3f7fb',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  feedCard: {
    marginBottom: 18,
  },
  feedContent: {
    paddingHorizontal: 16,
  },
  feedMeta: {
    color: '#d0dceb',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  feedPlayer: {
    backgroundColor: palette.navyDeep,
    flex: 1,
  },
  feedTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  feedTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 2,
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
  helperText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  infoActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  infoBody: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  infoCardAccent: {
    backgroundColor: palette.accentSoft,
    borderColor: '#b9eadf',
  },
  infoCardWarm: {
    backgroundColor: '#fff4eb',
    borderColor: '#ffd4bf',
  },
  infoStack: {
    gap: 12,
    marginBottom: 18,
  },
  infoTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
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
    backgroundColor: palette.navyDeep,
    borderRadius: 20,
    overflow: 'hidden',
  },
  playerShell: {
    backgroundColor: palette.navyDeep,
    borderRadius: 20,
    height: 260,
    marginTop: 14,
    overflow: 'hidden',
  },
  scopeNotice: {
    backgroundColor: palette.accentSoft,
    borderRadius: 18,
    padding: 14,
  },
  scopeNoticeText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  screenState: {
    backgroundColor: palette.bg,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  sheet: {
    backgroundColor: palette.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  sheetActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  sheetBackdrop: {
    backgroundColor: 'rgba(7, 18, 28, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    paddingBottom: 8,
  },
  sheetHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  sheetSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 250,
  },
  sheetTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
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
  inlineBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  reviewBadge: {
    backgroundColor: '#edf3f9',
    borderRadius: 999,
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reviewBody: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  reviewCard: {
    backgroundColor: '#eef4fb',
    borderRadius: 24,
    marginTop: 12,
    padding: 16,
  },
  reviewMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  reviewTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  videoFallback: {
    alignItems: 'center',
    backgroundColor: palette.navyDeep,
    flex: 1,
    justifyContent: 'center',
  },
  videoFallbackText: {
    color: '#d0dceb',
    fontSize: 13,
    fontWeight: '700',
  },
  videoFrame: {
    backgroundColor: palette.navyDeep,
    borderRadius: 30,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  videoShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.navySoft,
  },
  viewsText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
});
