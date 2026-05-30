import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fetchFeedback, respondToFeedback, submitFeedback, updateFeedbackStatus } from '@/config/api-auth';
import { getApiErrorMessage } from '@/config/api-analytics';
import type { FeedbackItem, FeedbackResponse, SimpleSuccessResponse, StoredUser } from '@/config/api-types';

const palette = {
  accent: '#0f7b6c',
  bg: '#f4f7fb',
  card: '#ffffff',
  danger: '#d9485f',
  ink: '#10253c',
  line: '#d9e3ef',
  muted: '#60738a',
  navy: '#17324d',
  soft: '#edf3f9',
  warm: '#ff8a5b',
};

interface BaseProps {
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
      style={[styles.button, { backgroundColor: colors[tone] }, disabled ? styles.buttonDisabled : null]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
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

async function reloadFeedback(
  session: StoredUser,
  setLoading: (value: boolean) => void,
  setError: (value: string | null) => void,
  setResponse: (value: FeedbackResponse | null) => void
) {
  setLoading(true);
  setError(null);
  try {
    const next = await fetchFeedback(session);
    setResponse(next);
  } catch (loadError) {
    setError(getApiErrorMessage(loadError, 'Could not load feedback right now.'));
  } finally {
    setLoading(false);
  }
}

export function StudentFeedbackSection({ isActive, onDirty, refreshToken, session }: BaseProps) {
  const [response, setResponse] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('General');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    fetchFeedback(session)
      .then((next) => {
        if (!isMounted) {
          return;
        }
        setResponse(next);
        if (next.categories.length > 0) {
          setCategory((current) => current || next.categories[0]);
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load feedback right now.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isActive, refreshToken, session]);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Feedback', 'Subject and message are required.');
      return;
    }

    setSaving(true);
    try {
      const result: SimpleSuccessResponse = await submitFeedback(session, {
        category,
        message: message.trim(),
        subject: subject.trim(),
      });
      Alert.alert('Feedback', result.message || 'Feedback submitted successfully.');
      setSubject('');
      setMessage('');
      onDirty();
      await reloadFeedback(session, setLoading, setError, setResponse);
    } catch (saveError) {
      Alert.alert('Feedback', getApiErrorMessage(saveError, 'Could not submit your feedback.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <SectionIntro
        title="Feedback"
        subtitle="Share bugs, suggestions, or notice issues directly with the campus system team."
      />

      <Panel>
        <Text style={styles.sectionTitle}>Send feedback</Text>
        <Text style={styles.label}>Category</Text>
        <View style={styles.wrapRow}>
          {(response?.categories || ['General']).map((item) => (
            <ChoicePill key={item} active={category === item} label={item} onPress={() => setCategory(item)} />
          ))}
        </View>
        <Text style={styles.label}>Subject</Text>
        <TextInput style={styles.input} value={subject} onChangeText={setSubject} />
        <Text style={styles.label}>Message</Text>
        <TextInput multiline style={[styles.input, styles.textArea]} value={message} onChangeText={setMessage} />
        <ActionButton
          disabled={saving}
          label={saving ? 'Sending...' : 'Submit feedback'}
          onPress={() => void submit()}
          tone="accent"
        />
      </Panel>

      {loading ? <LoadingState label="Loading feedback..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && response ? (
        <Panel>
          <Text style={styles.sectionTitle}>My feedback history</Text>
          {response.items.length === 0 ? (
            <Text style={styles.helperText}>You have not submitted any feedback yet.</Text>
          ) : (
            response.items.map((item) => (
              <FeedbackCard key={item.id} item={item} />
            ))
          )}
        </Panel>
      ) : null}
    </ScrollView>
  );
}

export function FeedbackInboxSection({ isActive, onDirty, refreshToken, session }: BaseProps) {
  const [response, setResponse] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    fetchFeedback(session)
      .then((next) => {
        if (isMounted) {
          setResponse(next);
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load the feedback inbox.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isActive, refreshToken, session]);

  const refresh = async () => {
    await reloadFeedback(session, setLoading, setError, setResponse);
  };

  const sendResponse = async (item: FeedbackItem) => {
    const draft = (responseDrafts[item.id] || '').trim();
    if (!draft) {
      Alert.alert('Feedback', 'Please write a response first.');
      return;
    }

    setSavingId(item.id);
    try {
      const result = await respondToFeedback(session, {
        admin_response: draft,
        feedback_id: item.id,
        status: 'responded',
      });
      Alert.alert('Feedback', result.message || 'Response sent successfully.');
      setResponseDrafts((current) => ({ ...current, [item.id]: '' }));
      onDirty();
      await refresh();
    } catch (saveError) {
      Alert.alert('Feedback', getApiErrorMessage(saveError, 'Could not send that response.'));
    } finally {
      setSavingId(null);
    }
  };

  const setStatus = async (item: FeedbackItem, status: string) => {
    setSavingId(item.id);
    try {
      const result = await updateFeedbackStatus(session, item.id, status);
      Alert.alert('Feedback', result.message || 'Feedback status updated.');
      onDirty();
      await refresh();
    } catch (saveError) {
      Alert.alert('Feedback', getApiErrorMessage(saveError, 'Could not update feedback status.'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <SectionIntro
        title="Feedback inbox"
        subtitle="Review student feedback, send responses, and track issue resolution."
      />

      {response ? (
        <View style={styles.metricGrid}>
          <MetricCard label="Open" value={response.stats.open} />
          <MetricCard label="In Review" value={response.stats.in_review} />
          <MetricCard label="Responded" value={response.stats.responded} />
          <MetricCard label="Closed" value={response.stats.closed} />
        </View>
      ) : null}

      {loading ? <LoadingState label="Loading feedback inbox..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && response ? (
        <Panel>
          <Text style={styles.sectionTitle}>Student feedback</Text>
          {response.items.length === 0 ? (
            <Text style={styles.helperText}>No feedback has been submitted yet.</Text>
          ) : (
            response.items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.inlineRowWrap}>
                  <StatusBadge label={item.category} />
                  <StatusBadge label={(response.statuses[item.status] || item.status).toUpperCase()} />
                </View>
                <Text style={styles.itemTitle}>{item.subject}</Text>
                <Text style={styles.metaText}>
                  {item.submitter_name || 'Student'} · {item.submitter_email || 'No email'} · {formatDateLabel(item.created_at)}
                </Text>
                <Text style={styles.bodyText}>{item.message}</Text>
                {item.admin_response ? (
                  <View style={styles.responseCard}>
                    <Text style={styles.responseTitle}>Latest response</Text>
                    <Text style={styles.bodyText}>{item.admin_response}</Text>
                    <Text style={styles.metaText}>
                      {item.responder_name || 'Super admin'} · {formatDateLabel(item.responded_at)}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.label}>Update status</Text>
                <View style={styles.wrapRow}>
                  {Object.entries(response.statuses).map(([value, label]) => (
                    <ChoicePill
                      key={`${item.id}-${value}`}
                      active={item.status === value}
                      label={label}
                      onPress={() => void setStatus(item, value)}
                    />
                  ))}
                </View>
                <Text style={styles.label}>Response</Text>
                <TextInput
                  multiline
                  placeholder="Write your response to the student"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, styles.textArea]}
                  value={responseDrafts[item.id] ?? item.admin_response ?? ''}
                  onChangeText={(value) =>
                    setResponseDrafts((current) => ({ ...current, [item.id]: value }))
                  }
                />
                <ActionButton
                  disabled={savingId === item.id}
                  label={savingId === item.id ? 'Sending...' : 'Send response'}
                  onPress={() => void sendResponse(item)}
                  tone="navy"
                />
              </View>
            ))
          )}
        </Panel>
      ) : null}
    </ScrollView>
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

function FeedbackCard({ item }: { item: FeedbackItem }) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.inlineRowWrap}>
        <StatusBadge label={item.category} />
        <StatusBadge label={item.status.replace('_', ' ')} />
      </View>
      <Text style={styles.itemTitle}>{item.subject}</Text>
      <Text style={styles.metaText}>{formatDateLabel(item.created_at)}</Text>
      <Text style={styles.bodyText}>{item.message}</Text>
      {item.admin_response ? (
        <View style={styles.responseCard}>
          <Text style={styles.responseTitle}>Response</Text>
          <Text style={styles.bodyText}>{item.admin_response}</Text>
          <Text style={styles.metaText}>
            {item.responder_name || 'Super admin'} · {formatDateLabel(item.responded_at)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: palette.soft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
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
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  choicePill: {
    backgroundColor: palette.soft,
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
    backgroundColor: '#ffe4e9',
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
  itemCard: {
    backgroundColor: palette.bg,
    borderRadius: 18,
    marginTop: 12,
    padding: 16,
  },
  itemTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  metaText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  metricCard: {
    backgroundColor: palette.soft,
    borderRadius: 18,
    flex: 1,
    minWidth: 96,
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
  panel: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 18,
  },
  responseCard: {
    backgroundColor: '#ffffff',
    borderColor: palette.line,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  responseTitle: {
    color: palette.navy,
    fontSize: 13,
    fontWeight: '800',
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
    minHeight: 130,
    textAlignVertical: 'top',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
