import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import React, { useDeferredValue, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  addNoticeComment,
  acknowledgeNotice,
  answerNoticeComment,
  changePassword,
  deleteNoticeComment,
  fetchArchiveNotices,
  fetchBookmarks,
  fetchNoticeDetail,
  fetchNotices,
  fetchNotifications,
  fetchProfile,
  FacultyOption,
  getApiErrorMessage,
  markNoticeViewed,
  NoticeCommentItem,
  NoticeDetailResponse,
  NoticeItem,
  noticeAttachmentUrl,
  NotificationItem,
  ProfileResponse,
  profilePictureUrl,
  runNotificationAction,
  saveNotificationPreferences,
  StoredUser,
  StudentDashboardData,
  toggleNoticeBookmark,
  updateNoticeCommentStatus,
  updateProfile,
  uploadProfilePhoto,
} from '@/config/api';

const palette = {
  accent: '#0f7b6c',
  accentSoft: '#dff8f2',
  bg: '#f4f7fb',
  card: '#ffffff',
  danger: '#d9485f',
  dangerSoft: '#ffe0e7',
  gold: '#d59b23',
  goldSoft: '#fff4d6',
  ink: '#10253c',
  line: '#d9e3ef',
  muted: '#60738a',
  navy: '#17324d',
  warm: '#ff8a5b',
  warmSoft: '#ffe8dd',
};

interface BaseSectionProps {
  isActive: boolean;
  onDirty: () => void;
  refreshToken: number;
  session: StoredUser;
}

interface NoticeListProps extends BaseSectionProps {
  categories: string[];
}

interface ProfileSectionProps extends BaseSectionProps {
  categories: string[];
  faculties: FacultyOption[];
  onSessionUpdated: (user: StoredUser) => void;
}

function SectionIntro({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <View>
      <Text style={styles.sectionHeadline}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
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

function MetricCard({
  active = false,
  label,
  onPress,
  tone,
  value,
}: {
  active?: boolean;
  label: string;
  onPress?: () => void;
  tone: 'accent' | 'danger' | 'gold' | 'warm';
  value: number;
}) {
  const backgrounds = {
    accent: palette.accentSoft,
    danger: palette.dangerSoft,
    gold: palette.goldSoft,
    warm: palette.warmSoft,
  };

  const content = (
    <View
      style={[
        styles.metricCard,
        { backgroundColor: backgrounds[tone] },
        active ? styles.metricCardActive : null,
      ]}
    >
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

function Badge({ label, tone }: { label: string; tone: 'accent' | 'danger' | 'gold' | 'warm' }) {
  const backgrounds = {
    accent: palette.accentSoft,
    danger: palette.dangerSoft,
    gold: palette.goldSoft,
    warm: palette.warmSoft,
  };

  return (
    <View style={[styles.badge, { backgroundColor: backgrounds[tone] }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active ? styles.chipActive : null]} onPress={onPress}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
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

function PreferenceRow({
  label,
  onValueChange,
  value,
}: {
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.preferenceRow}>
      <Text style={styles.preferenceLabel}>{label}</Text>
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
    return 'Recently';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

async function openNoticeAttachment(notice: NoticeItem) {
  const url = noticeAttachmentUrl(notice.attachment);
  if (!url) {
    return;
  }

  await WebBrowser.openBrowserAsync(url);
}

function fallbackNoticeDetail(notice: NoticeItem): NoticeDetailResponse {
  return {
    comments: [],
    notice,
    success: true,
  };
}

const commentDraftCache = new Map<number, string>();
const replyDraftCache = new Map<number, Record<number, string>>();

function NoticeCard({
  notice,
  onAcknowledge,
  onBookmark,
  onPress,
  readOnlyBookmark,
}: {
  notice: NoticeItem;
  onAcknowledge: (noticeId: number) => Promise<void> | void;
  onBookmark: (noticeId: number) => Promise<void> | void;
  onPress: () => void;
  readOnlyBookmark?: boolean;
}) {
  const isAcked = notice.acknowledgement_status === 'acknowledged';
  const isBookmarked = Boolean(notice.is_bookmarked);

  return (
    <Pressable style={styles.noticeCard} onPress={onPress}>
      <View style={styles.inlineRowWrap}>
        <Badge label={notice.category || 'General'} tone="accent" />
        <Badge label={(notice.priority || 'normal').toUpperCase()} tone="gold" />
        {notice.is_pinned ? <Badge label="Pinned" tone="warm" /> : null}
        {notice.attachment ? <Badge label="Attachment" tone="accent" /> : null}
        {notice.requires_acknowledgement ? (
          <Badge label={isAcked ? 'Acknowledged' : 'Acknowledge'} tone={isAcked ? 'accent' : 'danger'} />
        ) : null}
      </View>
      <Text style={styles.noticeTitle}>{notice.title}</Text>
      <Text style={styles.noticeBody} numberOfLines={4}>
        {notice.content}
      </Text>
      <View style={styles.inlineRowWrap}>
        <Text style={styles.metaText}>{notice.author_name || 'Campus admin'}</Text>
        <Text style={styles.metaText}>{formatDateLabel(notice.publish_at || notice.created_at)}</Text>
        <Text style={styles.metaText}>{notice.view_count || 0} views</Text>
      </View>
      <View style={styles.actionRow}>
        {!readOnlyBookmark ? (
          <ActionButton
            label={isBookmarked ? 'Remove save' : 'Save'}
            onPress={() => void onBookmark(notice.id)}
            tone="accent"
          />
        ) : null}
        {notice.attachment ? (
          <ActionButton label="Attachment" onPress={() => void openNoticeAttachment(notice)} tone="navy" />
        ) : null}
        {notice.requires_acknowledgement && !isAcked ? (
          <ActionButton label="Acknowledge" onPress={() => void onAcknowledge(notice.id)} tone="warm" />
        ) : null}
      </View>
    </Pressable>
  );
}

export function NoticeDetailModal({
  detail,
  onDetailChange,
  onAcknowledge,
  onBookmark,
  onClose,
  onDirty,
  readOnlyActions,
  session,
}: {
  detail: NoticeDetailResponse | null;
  onDetailChange: (detail: NoticeDetailResponse | null) => void;
  onAcknowledge: (noticeId: number) => Promise<void> | void;
  onBookmark: (noticeId: number) => Promise<void> | void;
  onClose: () => void;
  onDirty: () => void;
  readOnlyActions?: boolean;
  session: StoredUser;
}) {
  const [commentText, setCommentText] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<number, string>>({});
  const [working, setWorking] = useState(false);
  const noticeId = detail?.notice.id ?? null;

  useEffect(() => {
    if (noticeId === null) {
      setCommentText('');
      setAnswerDrafts({});
      return;
    }

    setCommentText(commentDraftCache.get(noticeId) || '');
    setAnswerDrafts(replyDraftCache.get(noticeId) || {});
  }, [noticeId]);

  useEffect(() => {
    if (noticeId === null) {
      return;
    }

    commentDraftCache.set(noticeId, commentText);
  }, [commentText, noticeId]);

  useEffect(() => {
    if (noticeId === null) {
      return;
    }

    replyDraftCache.set(noticeId, answerDrafts);
  }, [answerDrafts, noticeId]);

  if (!detail) {
    return null;
  }

  const notice = detail.notice;
  const isAcked = notice.acknowledgement_status === 'acknowledged';
  const canComment = detail.can_comment ?? session.role === 'student';
  const canModerateComments = detail.can_moderate_comments ?? session.role === 'super_admin';
  const visibleComments = detail.comments.filter((item) => item.status !== 'hidden' || canModerateComments);

  const refreshDetail = async () => {
    const next = await fetchNoticeDetail(session, notice.id);
    onDetailChange(next);
  };

  const submitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Comments', 'Please write your comment first.');
      return;
    }

    setWorking(true);
    try {
      const result = await addNoticeComment(session, notice.id, commentText.trim());
      Alert.alert('Comments', result.message || 'Comment posted successfully.');
      setCommentText('');
      await refreshDetail();
      onDirty();
    } catch (commentError) {
      Alert.alert('Comments', getApiErrorMessage(commentError, 'Could not post your comment.'));
    } finally {
      setWorking(false);
    }
  };

  const respondToComment = async (comment: NoticeCommentItem) => {
    const answer = (answerDrafts[comment.id] || '').trim();
    if (!answer) {
      Alert.alert('Comments', 'Please write a reply first.');
      return;
    }

    setWorking(true);
    try {
      const result = await answerNoticeComment(session, notice.id, comment.id, answer);
      Alert.alert('Comments', result.message || 'Reply posted successfully.');
      setAnswerDrafts((current) => ({ ...current, [comment.id]: '' }));
      await refreshDetail();
      onDirty();
    } catch (replyError) {
      Alert.alert('Comments', getApiErrorMessage(replyError, 'Could not send that reply.'));
    } finally {
      setWorking(false);
    }
  };

  const moderateComment = async (
    comment: NoticeCommentItem,
    action: 'delete_comment' | 'hide_comment' | 'reopen_comment'
  ) => {
    setWorking(true);
    try {
      const result =
        action === 'delete_comment'
          ? await deleteNoticeComment(session, notice.id, comment.id)
          : await updateNoticeCommentStatus(session, notice.id, comment.id, action);
      Alert.alert('Comments', result.message || 'Comment updated successfully.');
      await refreshDetail();
      onDirty();
    } catch (moderationError) {
      Alert.alert('Comments', getApiErrorMessage(moderationError, 'Could not update that comment.'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{notice.title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalBodyWrap}>
            <View style={styles.inlineRowWrap}>
              <Badge label={notice.category || 'General'} tone="accent" />
              <Badge label={(notice.priority || 'normal').toUpperCase()} tone="gold" />
              {notice.attachment ? <Badge label="Attachment included" tone="warm" /> : null}
            </View>
            <Text style={styles.modalMeta}>
              {notice.author_name || 'Campus admin'} · {formatDateLabel(notice.publish_at || notice.created_at)}
            </Text>
            {notice.location_name ? <Text style={styles.helperText}>Location: {notice.location_name}</Text> : null}
            {notice.event_date ? (
              <Text style={styles.helperText}>Event time: {formatDateLabel(notice.event_date)}</Text>
            ) : null}
            <Text style={styles.modalBody}>{notice.content}</Text>
            {notice.acknowledgement_due_at ? (
              <Text style={styles.helperText}>
                Acknowledgement due: {formatDateLabel(notice.acknowledgement_due_at)}
              </Text>
            ) : null}
            <View style={styles.commentsBlock}>
          <Text style={styles.commentsTitle}>Comments & clarifications</Text>
          <Text style={styles.helperText}>
            Students can ask for clarification here, and super admins can post official replies or moderate the thread.
          </Text>
              {canComment ? (
                <View style={styles.commentComposer}>
                  <TextInput
                    multiline
                    blurOnSubmit={false}
                    placeholder="Ask a question or leave a comment about this notice"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, styles.commentInput]}
                    value={commentText}
                    onChangeText={setCommentText}
                  />
                  <ActionButton
                    disabled={working}
                    label={working ? 'Posting...' : 'Post comment'}
                    onPress={() => void submitComment()}
                    tone="accent"
                  />
                </View>
              ) : null}
              {visibleComments.length === 0 ? (
                <Text style={styles.helperText}>No comments yet.</Text>
              ) : (
                visibleComments.map((comment) => (
                  <View key={comment.id} style={styles.commentCard}>
                    <View style={styles.inlineRowWrap}>
                      <Badge label={comment.status.replace('_', ' ')} tone={comment.status === 'hidden' ? 'danger' : 'accent'} />
                    </View>
                    <Text style={styles.commentAuthor}>
                      {comment.asker_name} · {formatDateLabel(comment.created_at)}
                    </Text>
                    <Text style={styles.commentText}>{comment.question}</Text>
                    {comment.answer ? (
                      <View style={styles.commentAnswerCard}>
                        <Text style={styles.commentAnswerTitle}>Official reply</Text>
                        <Text style={styles.commentText}>{comment.answer}</Text>
                        <Text style={styles.metaText}>
                          {comment.answerer_name || 'Super admin'} · {formatDateLabel(comment.answered_at)}
                        </Text>
                      </View>
                    ) : null}
                    {canModerateComments ? (
                      <>
                        {!comment.answer ? (
                          <>
                            <TextInput
                              multiline
                              blurOnSubmit={false}
                              placeholder="Write an official reply"
                              placeholderTextColor={palette.muted}
                              style={[styles.input, styles.commentInput]}
                              value={answerDrafts[comment.id] || ''}
                              onChangeText={(value) =>
                                setAnswerDrafts((current) => ({ ...current, [comment.id]: value }))
                              }
                            />
                            <ActionButton
                              disabled={working}
                              label="Reply"
                              onPress={() => void respondToComment(comment)}
                              tone="navy"
                            />
                          </>
                        ) : null}
                        <View style={styles.actionRow}>
                          {comment.status !== 'hidden' ? (
                            <ActionButton
                              disabled={working}
                              label="Hide"
                              onPress={() => void moderateComment(comment, 'hide_comment')}
                              tone="warm"
                            />
                          ) : (
                            <ActionButton
                              disabled={working}
                              label="Reopen"
                              onPress={() => void moderateComment(comment, 'reopen_comment')}
                              tone="accent"
                            />
                          )}
                          <ActionButton
                            disabled={working}
                            label="Delete"
                            onPress={() => void moderateComment(comment, 'delete_comment')}
                            tone="danger"
                          />
                        </View>
                      </>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
          <View style={styles.actionRow}>
            {!readOnlyActions ? (
              <ActionButton label="Save" onPress={() => void onBookmark(notice.id)} tone="accent" />
            ) : null}
            {notice.attachment ? (
              <ActionButton label="Open attachment" onPress={() => void openNoticeAttachment(notice)} tone="navy" />
            ) : null}
            {!readOnlyActions && notice.requires_acknowledgement && !isAcked ? (
              <ActionButton label="Acknowledge" onPress={() => void onAcknowledge(notice.id)} tone="warm" />
            ) : null}
            <ActionButton label="Close" onPress={onClose} tone="navy" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function StudentFeedSection({
  categories,
  isActive,
  onDirty,
  refreshToken,
  session,
  summary,
}: NoticeListProps & { summary?: StudentDashboardData | null }) {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedNotice, setSelectedNotice] = useState<NoticeDetailResponse | null>(null);
  const [quickFilter, setQuickFilter] = useState<'all' | 'saved' | 'unread' | 'urgent'>('all');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const loadFeed = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const feed = await fetchNotices(session);
      setNotices(feed);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Could not load notices right now.'));
    } finally {
      if (mode === 'refresh') {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;
    async function load() {
      try {
        const feed = await fetchNotices(session);
        if (isMounted) {
          setNotices(feed);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load notices right now.'));
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

  const filtered = notices.filter((notice) => {
    const matchesSearch =
      deferredSearch === '' ||
      notice.title.toLowerCase().includes(deferredSearch) ||
      notice.content.toLowerCase().includes(deferredSearch) ||
      (notice.author_name || '').toLowerCase().includes(deferredSearch);

    const matchesCategory = selectedCategory === 'All' || notice.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const quickFiltered = filtered.filter((notice) => {
    switch (quickFilter) {
      case 'saved':
        return Boolean(notice.is_bookmarked);
      case 'unread':
        return !Boolean(notice.has_viewed);
      case 'urgent':
        return (
          ['high', 'critical'].includes((notice.priority || '').toLowerCase()) ||
          Boolean(notice.requires_acknowledgement)
        );
      default:
        return true;
    }
  });

  const toggleQuickFilter = (next: 'saved' | 'unread' | 'urgent') => {
    setQuickFilter((current) => (current === next ? 'all' : next));
  };

  const openNotice = async (notice: NoticeItem) => {
    setSelectedNotice(fallbackNoticeDetail(notice));

    try {
      await markNoticeViewed(session, notice.id);
      const detail = await fetchNoticeDetail(session, notice.id);
      setSelectedNotice(detail);
      onDirty();
    } catch {
      // Keep the initial card data if the detail fetch fails.
    }
  };

  const handleBookmark = async (noticeId: number) => {
    try {
      await toggleNoticeBookmark(session, noticeId);
      setNotices((current) =>
        current.map((notice) =>
          notice.id === noticeId
            ? { ...notice, is_bookmarked: notice.is_bookmarked ? 0 : 1 }
            : notice
        )
      );
      onDirty();
    } catch (bookmarkError) {
      Alert.alert('Bookmark', getApiErrorMessage(bookmarkError, 'Could not update the bookmark.'));
    }
  };

  const handleAcknowledge = async (noticeId: number) => {
    try {
      await acknowledgeNotice(session, noticeId);
      setNotices((current) =>
        current.map((notice) =>
          notice.id === noticeId
            ? { ...notice, acknowledgement_status: 'acknowledged' }
            : notice
        )
      );
      setSelectedNotice((current) =>
        current && current.notice.id === noticeId
          ? { ...current, notice: { ...current.notice, acknowledgement_status: 'acknowledged' } }
          : current
      );
      onDirty();
    } catch (ackError) {
      Alert.alert(
        'Acknowledge',
        getApiErrorMessage(ackError, 'Could not acknowledge this notice.')
      );
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.sectionContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          colors={[palette.accent]}
          tintColor={palette.accent}
          onRefresh={() => void loadFeed('refresh')}
        />
      }
    >
      <SectionIntro
        title="Notice feed"
        subtitle="The latest campus updates for your faculty, year, and subscriptions."
      />

      {summary ? (
        <View style={styles.metricRow}>
          <MetricCard
            active={quickFilter === 'unread'}
            label="Unread"
            onPress={() => toggleQuickFilter('unread')}
            tone="gold"
            value={summary.unread_count}
          />
          <MetricCard
            active={quickFilter === 'urgent'}
            label="Urgent"
            onPress={() => toggleQuickFilter('urgent')}
            tone="danger"
            value={summary.urgent_count}
          />
          <MetricCard
            active={quickFilter === 'saved'}
            label="Saved"
            onPress={() => toggleQuickFilter('saved')}
            tone="accent"
            value={summary.bookmark_count}
          />
        </View>
      ) : null}
      <Text style={styles.helperText}>
        Tap Unread, Urgent, or Saved to filter the feed, or pull down to refresh for newly published notices.
      </Text>
      {quickFilter !== 'all' ? (
        <Pressable onPress={() => setQuickFilter('all')} style={styles.inlineFilterReset}>
          <Text style={styles.inlineFilterResetText}>Clear quick filter</Text>
        </Pressable>
      ) : null}

      <Panel>
        <Text style={styles.label}>Search notices</Text>
        <TextInput
          placeholder="Search by title, content, or author"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip}>
          {['All', ...categories].map((category) => (
            <Chip
              key={category}
              active={selectedCategory === category}
              label={category}
              onPress={() => setSelectedCategory(category)}
            />
          ))}
        </ScrollView>
      </Panel>

      {loading ? <LoadingState label="Loading your feed..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && quickFiltered.length === 0 ? (
        <EmptyState
          body={
            quickFilter === 'all'
              ? 'Try a different search term or category.'
              : 'Try a different search term, category, or clear the quick filter.'
          }
          title="No notices matched your filters"
        />
      ) : null}

      {quickFiltered.map((notice) => (
        <NoticeCard
          key={notice.id}
          notice={notice}
          onAcknowledge={handleAcknowledge}
          onBookmark={handleBookmark}
          onPress={() => void openNotice(notice)}
        />
      ))}

      <NoticeDetailModal
        detail={selectedNotice}
        onDetailChange={setSelectedNotice}
        onAcknowledge={handleAcknowledge}
        onBookmark={handleBookmark}
        onClose={() => setSelectedNotice(null)}
        onDirty={onDirty}
        session={session}
      />
    </ScrollView>
  );
}

export function NotificationsSection({
  isActive,
  onDirty,
  refreshToken,
  session,
}: BaseSectionProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<NoticeDetailResponse | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchNotifications(session);
        if (isMounted) {
          setNotifications(response.notifications);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load notifications.'));
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

  const performAction = async (action: 'mark_all_read' | 'delete_all', label: string) => {
    try {
      await runNotificationAction(session, action);
      if (action === 'mark_all_read') {
        setNotifications((current) => current.map((item) => ({ ...item, is_read: 1 })));
      } else {
        setNotifications([]);
      }
      onDirty();
    } catch (actionError) {
      Alert.alert(label, getApiErrorMessage(actionError, `Could not ${label.toLowerCase()}.`));
    }
  };

  const openNotice = async (notification: NotificationItem) => {
    if (!notification.notice_id) {
      return;
    }

    try {
      await runNotificationAction(session, 'mark_read', notification.id);
      const detail = await fetchNoticeDetail(session, notification.notice_id);
      setSelectedNotice(detail);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: 1 } : item))
      );
      onDirty();
    } catch (openError) {
      Alert.alert('Notification', getApiErrorMessage(openError, 'Could not open this notice.'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.sectionContent}>
      <SectionIntro
        title="Notifications"
        subtitle="Important alerts and updates sent directly to your account."
      />

      <View style={styles.actionRow}>
        <ActionButton
          label="Mark all read"
          onPress={() => void performAction('mark_all_read', 'Mark all read')}
          tone="accent"
        />
        <ActionButton
          label="Delete all"
          onPress={() => void performAction('delete_all', 'Delete all')}
          tone="danger"
        />
      </View>

      {loading ? <LoadingState label="Loading notifications..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && notifications.length === 0 ? (
        <EmptyState body="You are all caught up right now." title="No notifications yet" />
      ) : null}

      {notifications.map((notification) => (
        <Pressable
          key={notification.id}
          style={[
            styles.notificationCard,
            !notification.is_read ? styles.notificationCardUnread : null,
          ]}
          onPress={() => void openNotice(notification)}
        >
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationBody}>{notification.message}</Text>
          <View style={styles.inlineRowWrap}>
            <Text style={styles.metaText}>{notification.time_ago || 'Just now'}</Text>
            {!notification.is_read ? <Badge label="Unread" tone="gold" /> : null}
          </View>
        </Pressable>
      ))}

      <NoticeDetailModal
        detail={selectedNotice}
        onDetailChange={setSelectedNotice}
        onAcknowledge={() => Promise.resolve()}
        onBookmark={() => Promise.resolve()}
        onClose={() => setSelectedNotice(null)}
        onDirty={onDirty}
        readOnlyActions
        session={session}
      />
    </ScrollView>
  );
}

export function BookmarksSection({ categories, isActive, onDirty, refreshToken, session }: NoticeListProps) {
  const [bookmarks, setBookmarks] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<NoticeDetailResponse | null>(null);
  const [search, setSearch] = useState('');
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
        const saved = await fetchBookmarks(session);
        if (isMounted) {
          setBookmarks(saved);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load bookmarks.'));
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

  const filtered = bookmarks.filter((notice) => {
    if (deferredSearch === '') {
      return true;
    }

    return (
      notice.title.toLowerCase().includes(deferredSearch) ||
      notice.content.toLowerCase().includes(deferredSearch) ||
      (notice.category || '').toLowerCase().includes(deferredSearch)
    );
  });

  const handleBookmark = async (noticeId: number) => {
    try {
      await toggleNoticeBookmark(session, noticeId);
      setBookmarks((current) => current.filter((notice) => notice.id !== noticeId));
      onDirty();
    } catch (bookmarkError) {
      Alert.alert('Bookmark', getApiErrorMessage(bookmarkError, 'Could not remove bookmark.'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.sectionContent}>
      <SectionIntro title="Bookmarks" subtitle="Quick access to notices you want to revisit later." />

      <Panel>
        <Text style={styles.label}>Search saved notices</Text>
        <TextInput
          placeholder="Search your bookmarks"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={styles.helperText}>
          {categories.length} notice categories are supported in the app.
        </Text>
      </Panel>

      {loading ? <LoadingState label="Loading bookmarks..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <EmptyState body="Save notices from the feed to find them here later." title="No bookmarks yet" />
      ) : null}

      {filtered.map((notice) => (
        <NoticeCard
          key={notice.id}
          notice={notice}
          onAcknowledge={() => Promise.resolve()}
          onBookmark={handleBookmark}
          onPress={() => {
            setSelectedNotice(fallbackNoticeDetail(notice));
            void fetchNoticeDetail(session, notice.id)
              .then(setSelectedNotice)
              .catch(() => {});
          }}
        />
      ))}

      <NoticeDetailModal
        detail={selectedNotice}
        onDetailChange={setSelectedNotice}
        onAcknowledge={() => Promise.resolve()}
        onBookmark={handleBookmark}
        onClose={() => setSelectedNotice(null)}
        onDirty={onDirty}
        session={session}
      />
    </ScrollView>
  );
}

export function ArchiveSection({ categories, isActive, onDirty, refreshToken, session }: NoticeListProps) {
  const [archive, setArchive] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [priority, setPriority] = useState('All');
  const [status, setStatus] = useState<'all' | 'current' | 'expired'>('all');
  const [selectedNotice, setSelectedNotice] = useState<NoticeDetailResponse | null>(null);
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
        const data = await fetchArchiveNotices(session);
        if (isMounted) {
          setArchive(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load the archive.'));
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

  const filtered = archive.filter((notice) => {
    const matchesSearch =
      deferredSearch === '' ||
      notice.title.toLowerCase().includes(deferredSearch) ||
      notice.content.toLowerCase().includes(deferredSearch);

    const matchesCategory = category === 'All' || notice.category === category;
    const matchesPriority =
      priority === 'All' || (notice.priority || 'normal').toLowerCase() === priority.toLowerCase();
    const isExpired = Boolean(notice.expire_at) && new Date(notice.expire_at!).getTime() <= Date.now();
    const matchesStatus =
      status === 'all' || (status === 'expired' ? isExpired : !isExpired);

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  return (
    <ScrollView contentContainerStyle={styles.sectionContent}>
      <SectionIntro
        title="Archive"
        subtitle="Search through published and archived notices without leaving the app."
      />

      <Panel>
        <Text style={styles.label}>Keyword</Text>
        <TextInput
          placeholder="Search the archive"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip}>
          {['All', ...categories].map((item) => (
            <Chip key={item} active={category === item} label={item} onPress={() => setCategory(item)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip}>
          {['All', 'normal', 'high', 'critical'].map((item) => (
            <Chip key={item} active={priority === item} label={item} onPress={() => setPriority(item)} />
          ))}
        </ScrollView>
        <View style={styles.inlineRowWrap}>
          {[
            ['all', 'All notices'],
            ['current', 'Current'],
            ['expired', 'Expired'],
          ].map(([value, label]) => (
            <Chip
              key={value}
              active={status === value}
              label={label}
              onPress={() => setStatus(value as 'all' | 'current' | 'expired')}
            />
          ))}
        </View>
      </Panel>

      {loading ? <LoadingState label="Loading archive..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <EmptyState body="Try widening your filters or search." title="No archive matches" />
      ) : null}

      {filtered.map((notice) => (
        <NoticeCard
          key={notice.id}
          notice={notice}
          onAcknowledge={() => Promise.resolve()}
          onBookmark={() => Promise.resolve()}
          onPress={() => {
            setSelectedNotice(fallbackNoticeDetail(notice));
            void fetchNoticeDetail(session, notice.id)
              .then(setSelectedNotice)
              .catch(() => {});
          }}
          readOnlyBookmark
        />
      ))}

      <NoticeDetailModal
        detail={selectedNotice}
        onDetailChange={setSelectedNotice}
        onAcknowledge={() => Promise.resolve()}
        onBookmark={() => Promise.resolve()}
        onClose={() => setSelectedNotice(null)}
        onDirty={onDirty}
        readOnlyActions
        session={session}
      />
    </ScrollView>
  );
}

export function ProfileSection({
  categories,
  faculties,
  isActive,
  onDirty,
  onSessionUpdated,
  refreshToken,
  session,
}: ProfileSectionProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email);
  const [phoneNumber, setPhoneNumber] = useState(session.phone_number || '');
  const [year, setYear] = useState<string>(session.year ? String(session.year) : '');
  const [membership, setMembership] = useState(session.membership || '');
  const [selectedFaculty, setSelectedFaculty] = useState<number | null>(session.faculty_id || null);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(session.department_id || null);
  const [customDepartment, setCustomDepartment] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    confirm_password: '',
    current_password: '',
    new_password: '',
  });

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchProfile(session);
        if (!isMounted) {
          return;
        }

        setProfile(response);
        setName(response.user.name);
        setEmail(response.user.email);
        setPhoneNumber(response.user.phone_number || '');
        setYear(response.user.year ? String(response.user.year) : '');
        setMembership(response.user.membership || '');
        setSelectedFaculty(response.user.faculty_id || null);
        setSelectedDepartment(response.user.department_id || null);
        setCustomDepartment('');
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load your profile.'));
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

  const preferences = profile?.notification_preferences;
  const avatarUrl = profilePictureUrl(profile?.user.profile_picture || session.profile_picture);
  const departments = profile?.departments || [];
  const visibleDepartments = departments.filter(
    (department) =>
      selectedFaculty === null || department.faculty_id === selectedFaculty || department.faculty_id === null
  );

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

  const handleProfilePhotoPick = async () => {
    setSaving(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Profile picture', 'Photo library access is required to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const response = await uploadProfilePhoto(session, {
        mimeType: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `profile-${Date.now()}.jpg`,
        uri: asset.uri,
      });

      if (response.user) {
        await onSessionUpdated(response.user);
        setProfile((current) => (current ? { ...current, user: response.user! } : current));
      }

      Alert.alert('Profile picture', response.message || 'Profile picture updated successfully.');
      onDirty();
    } catch (uploadError) {
      Alert.alert(
        'Profile picture',
        getApiErrorMessage(uploadError, 'Could not upload your profile picture.')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const response = await updateProfile(session, {
        department_id: selectedDepartment,
        department_name: selectedDepartment === null ? customDepartment.trim() || null : null,
        email,
        faculty_id: selectedFaculty,
        membership,
        name,
        phone_number: phoneNumber.trim() || null,
        year: year === '' ? null : Number(year),
      });

      if (response.user) {
        await onSessionUpdated(response.user);
        setProfile((current) => (current ? { ...current, user: response.user! } : current));
      }

      Alert.alert('Profile', response.message || 'Profile updated successfully.');
      onDirty();
    } catch (saveError) {
      Alert.alert('Profile', getApiErrorMessage(saveError, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSave = async () => {
    if (!preferences) {
      return;
    }

    setSaving(true);
    try {
      const response = await saveNotificationPreferences(session, {
        categories: preferences.categories,
        email_enabled: Boolean(preferences.email_enabled),
        emergency_override: Boolean(preferences.emergency_override),
        in_app_enabled: Boolean(preferences.in_app_enabled),
        quiet_hours_end: preferences.quiet_hours_end || null,
        quiet_hours_start: preferences.quiet_hours_start || null,
        sms_enabled: Boolean(preferences.sms_enabled),
      });
      Alert.alert('Preferences', response.message || 'Notification preferences saved.');
      onDirty();
    } catch (saveError) {
      Alert.alert(
        'Preferences',
        getApiErrorMessage(saveError, 'Could not save your notification preferences.')
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setSaving(true);
    try {
      const response = await changePassword(session, passwordForm);
      setPasswordForm({
        confirm_password: '',
        current_password: '',
        new_password: '',
      });
      Alert.alert('Password', response.message || 'Password updated successfully.');
    } catch (saveError) {
      Alert.alert('Password', getApiErrorMessage(saveError, 'Could not update password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.sectionContent}>
      <SectionIntro title="Profile" subtitle="Manage your account details and app preferences." />

      {loading ? <LoadingState label="Loading your profile..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {profile ? (
        <>
          <Panel>
            <View style={styles.profileHero}>
              {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatar} /> : null}
              <View style={styles.profileHeroCopy}>
                <Text style={styles.profileName}>{profile.user.name}</Text>
                <Text style={styles.profileMeta}>{profile.user.email}</Text>
                <Text style={styles.profileMeta}>
                  {profile.user.faculty_name || 'Faculty not set'}
                  {profile.user.year ? ` · Year ${profile.user.year}` : ''}
                </Text>
              </View>
            </View>
            <ActionButton
              disabled={saving}
              label={saving ? 'Uploading...' : 'Upload profile photo'}
              onPress={() => void handleProfilePhotoPick()}
              tone="navy"
            />
          </Panel>

          <View style={styles.metricRow}>
            <MetricCard label="Bookmarks" tone="accent" value={profile.stats.bookmark_count} />
            <MetricCard label="Views" tone="gold" value={profile.stats.viewed_count} />
            <MetricCard label="Notices" tone="warm" value={profile.stats.notice_count} />
          </View>

          <Panel>
            <Text style={styles.sectionTitle}>Account details</Text>
            <Text style={styles.label}>Full name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            <Text style={styles.label}>Email address</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              keyboardType="phone-pad"
              placeholder="+2547..."
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
            <Text style={styles.label}>Faculty</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip}>
              <Chip active={selectedFaculty === null} label="Not set" onPress={() => setSelectedFaculty(null)} />
              {faculties.map((faculty) => (
                <Chip
                  key={faculty.id}
                  active={selectedFaculty === faculty.id}
                  label={faculty.name}
                  onPress={() => {
                    setSelectedFaculty(faculty.id);
                    setCustomDepartment('');
                  }}
                />
              ))}
            </ScrollView>
            <Text style={styles.label}>Department</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip}>
              <Chip active={selectedDepartment === null} label="Not set" onPress={() => setSelectedDepartment(null)} />
              {visibleDepartments.map((department) => (
                <Chip
                  key={department.id}
                  active={selectedDepartment === department.id}
                  label={department.name}
                  onPress={() => {
                    setSelectedDepartment(department.id);
                    setCustomDepartment('');
                  }}
                />
              ))}
            </ScrollView>
            <TextInput
              placeholder="Or type a department name"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={customDepartment}
              onChangeText={(value) => {
                setCustomDepartment(value);
                if (value.trim() !== '') {
                  setSelectedDepartment(null);
                }
              }}
            />
            <Text style={styles.label}>Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip}>
              {['', '1', '2', '3', '4'].map((value) => (
                <Chip
                  key={value || 'none'}
                  active={year === value}
                  label={value === '' ? 'Not set' : `Year ${value}`}
                  onPress={() => setYear(value)}
                />
              ))}
            </ScrollView>
            <Text style={styles.label}>Membership</Text>
            <TextInput
              placeholder="Club, society, or leadership role"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={membership}
              onChangeText={setMembership}
            />
            <ActionButton
              disabled={saving}
              label={saving ? 'Saving...' : 'Save profile'}
              onPress={() => void handleProfileSave()}
              tone="accent"
            />
          </Panel>

          <Panel>
            <Text style={styles.sectionTitle}>Notification preferences</Text>
            {preferences ? (
              <>
                <PreferenceRow
                  label="In-app notifications"
                  value={Boolean(preferences.in_app_enabled)}
                  onValueChange={(value) =>
                    setProfile((current) =>
                      current
                        ? {
                            ...current,
                            notification_preferences: {
                              ...current.notification_preferences,
                              in_app_enabled: value ? 1 : 0,
                            },
                          }
                        : current
                    )
                  }
                />
                <PreferenceRow
                  label="Email notifications"
                  value={Boolean(preferences.email_enabled)}
                  onValueChange={(value) =>
                    setProfile((current) =>
                      current
                        ? {
                            ...current,
                            notification_preferences: {
                              ...current.notification_preferences,
                              email_enabled: value ? 1 : 0,
                            },
                          }
                        : current
                    )
                  }
                />
                <PreferenceRow
                  label="SMS notifications"
                  value={Boolean(preferences.sms_enabled)}
                  onValueChange={(value) =>
                    setProfile((current) =>
                      current
                        ? {
                            ...current,
                            notification_preferences: {
                              ...current.notification_preferences,
                              sms_enabled: value ? 1 : 0,
                            },
                          }
                        : current
                    )
                  }
                />
                <PreferenceRow
                  label="Emergency override"
                  value={Boolean(preferences.emergency_override)}
                  onValueChange={(value) =>
                    setProfile((current) =>
                      current
                        ? {
                            ...current,
                            notification_preferences: {
                              ...current.notification_preferences,
                              emergency_override: value ? 1 : 0,
                            },
                          }
                        : current
                    )
                  }
                />
                <Text style={styles.label}>Quiet hours start</Text>
                <TextInput
                  placeholder="22:00"
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={preferences.quiet_hours_start || ''}
                  onChangeText={(value) =>
                    setProfile((current) =>
                      current
                        ? {
                            ...current,
                            notification_preferences: {
                              ...current.notification_preferences,
                              quiet_hours_start: value,
                            },
                          }
                        : current
                    )
                  }
                />
                <Text style={styles.label}>Quiet hours end</Text>
                <TextInput
                  placeholder="06:00"
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={preferences.quiet_hours_end || ''}
                  onChangeText={(value) =>
                    setProfile((current) =>
                      current
                        ? {
                            ...current,
                            notification_preferences: {
                              ...current.notification_preferences,
                              quiet_hours_end: value,
                            },
                          }
                        : current
                    )
                  }
                />
                <Text style={styles.label}>Subscribed categories</Text>
                <View style={styles.wrapRow}>
                  {categories.map((categoryOption) => {
                    const active = preferences.categories.includes(categoryOption);
                    return (
                      <Chip
                        key={categoryOption}
                        active={active}
                        label={categoryOption}
                        onPress={() =>
                          setProfile((current) => {
                            if (!current) {
                              return current;
                            }

                            const nextCategories = active
                              ? current.notification_preferences.categories.filter((item) => item !== categoryOption)
                              : [...current.notification_preferences.categories, categoryOption];

                            return {
                              ...current,
                              notification_preferences: {
                                ...current.notification_preferences,
                                categories: nextCategories,
                              },
                            };
                          })
                        }
                      />
                    );
                  })}
                </View>
                <ActionButton
                  disabled={saving}
                  label="Save preferences"
                  onPress={() => void handlePreferencesSave()}
                  tone="warm"
                />
              </>
            ) : null}
          </Panel>

          <Panel>
            <Text style={styles.sectionTitle}>Change password</Text>
            <Text style={styles.label}>Current password</Text>
            <TextInput
              secureTextEntry
              style={styles.input}
              value={passwordForm.current_password}
              onChangeText={(value) =>
                setPasswordForm((current) => ({ ...current, current_password: value }))
              }
            />
            <Text style={styles.label}>New password</Text>
            <TextInput
              secureTextEntry
              style={styles.input}
              value={passwordForm.new_password}
              onChangeText={(value) =>
                setPasswordForm((current) => ({ ...current, new_password: value }))
              }
            />
            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              secureTextEntry
              style={styles.input}
              value={passwordForm.confirm_password}
              onChangeText={(value) =>
                setPasswordForm((current) => ({ ...current, confirm_password: value }))
              }
            />
            <ActionButton
              disabled={saving}
              label="Update password"
              onPress={() => void handlePasswordChange()}
              tone="danger"
            />
          </Panel>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionButtonDisabled: {
    opacity: 0.5,
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
  avatar: {
    borderRadius: 44,
    height: 88,
    width: 88,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
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
    backgroundColor: palette.navy,
  },
  chipStrip: {
    marginTop: 10,
  },
  chipText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  commentAnswerCard: {
    backgroundColor: '#ffffff',
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  commentAnswerTitle: {
    color: palette.navy,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  commentAuthor: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  commentCard: {
    backgroundColor: '#eef4fb',
    borderRadius: 16,
    marginTop: 12,
    padding: 14,
  },
  commentComposer: {
    marginTop: 12,
  },
  commentInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  commentText: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  commentsBlock: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 18,
  },
  commentsTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
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
  helperText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  inlineFilterReset: {
    alignSelf: 'flex-start',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inlineFilterResetText: {
    color: palette.navy,
    fontSize: 12,
    fontWeight: '700',
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
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  metaText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  metricCard: {
    borderRadius: 18,
    flex: 1,
    minWidth: 96,
    padding: 16,
  },
  metricCardActive: {
    borderColor: palette.navy,
    borderWidth: 2,
  },
  metricLabel: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: '900',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(9, 23, 38, 0.62)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
  },
  modalBody: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 24,
  },
  modalBodyWrap: {
    marginTop: 14,
    maxHeight: 380,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
  },
  modalMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 14,
    marginTop: 10,
  },
  modalTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  noticeBody: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  noticeCard: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 18,
  },
  noticeTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 14,
  },
  notificationBody: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  notificationCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
  },
  notificationCardUnread: {
    borderColor: palette.gold,
    borderWidth: 1,
  },
  notificationTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  panel: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 18,
  },
  preferenceLabel: {
    color: palette.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 12,
  },
  preferenceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  profileHero: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  profileHeroCopy: {
    flex: 1,
  },
  profileMeta: {
    color: palette.muted,
    fontSize: 13,
    marginTop: 4,
  },
  profileName: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  sectionContent: {
    backgroundColor: palette.bg,
    gap: 14,
    paddingBottom: 48,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionHeadline: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
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
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
