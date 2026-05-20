import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import React, { useDeferredValue, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AdminDashboardData,
  createAdminNotice,
  fetchAdminNotices,
  getApiErrorMessage,
  NoticeItem,
  noticeAttachmentUrl,
  runAdminNoticeAction,
  StoredUser,
  UploadAsset,
} from '@/config/api';

const palette = {
  accent: '#0f7b6c',
  bg: '#f4f7fb',
  card: '#ffffff',
  danger: '#d9485f',
  ink: '#10253c',
  line: '#d9e3ef',
  muted: '#60738a',
  navy: '#17324d',
  warm: '#ff8a5b',
};

interface BaseProps {
  isActive: boolean;
  onDirty: () => void;
  refreshToken: number;
  session: StoredUser;
}

export function AdminDashboardSection({
  dashboard,
}: {
  dashboard?: AdminDashboardData | null;
}) {
  if (!dashboard) {
    return (
      <ScrollView contentContainerStyle={styles.sectionContent}>
        <SectionIntro title="Dashboard" subtitle="Your role-based university control center." />
        <Panel>
          <Text style={styles.mutedText}>Dashboard data is loading...</Text>
        </Panel>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.sectionContent}>
      <SectionIntro title="Dashboard" subtitle="Your role-based university control center." />

      <View style={styles.metricGrid}>
        <MetricCard label="Notices" value={dashboard.total_notices} />
        <MetricCard label="Students" value={dashboard.total_students} />
        <MetricCard label="Views" value={dashboard.total_views} />
        <MetricCard label="Bookmarks" value={dashboard.total_bookmarks} />
        <MetricCard label="Pending" value={dashboard.pending_approvals} />
        <MetricCard label="Questions" value={dashboard.open_questions} />
      </View>

      <Panel>
        <Text style={styles.sectionTitle}>Recent notices</Text>
        {dashboard.recent_notices.length === 0 ? (
          <Text style={styles.mutedText}>No notices yet.</Text>
        ) : (
          dashboard.recent_notices.map((notice) => (
            <View key={notice.id} style={styles.listRow}>
              <Text style={styles.listTitle}>{notice.title}</Text>
              <Text style={styles.listMeta}>{notice.category || 'General'} · {formatDateLabel(notice.created_at)}</Text>
            </View>
          ))
        )}
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Recent students</Text>
        {dashboard.recent_students.length === 0 ? (
          <Text style={styles.mutedText}>No recent student activity.</Text>
        ) : (
          dashboard.recent_students.map((student) => (
            <View key={student.id} style={styles.listRow}>
              <Text style={styles.listTitle}>{student.name}</Text>
              <Text style={styles.listMeta}>{student.email} · {student.year ? `Year ${student.year}` : 'Year not set'}</Text>
            </View>
          ))
        )}
      </Panel>
    </ScrollView>
  );
}

export function ManageNoticesSection({ isActive, onDirty, refreshToken, session }: BaseProps) {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
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
        const response = await fetchAdminNotices(session);
        if (isMounted) {
          setNotices(response.notices);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load managed notices.'));
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
    if (deferredSearch === '') {
      return true;
    }

    return (
      notice.title.toLowerCase().includes(deferredSearch) ||
      notice.content.toLowerCase().includes(deferredSearch) ||
      (notice.status || '').toLowerCase().includes(deferredSearch)
    );
  });

  const runAction = async (
    action: 'archive' | 'approve' | 'delete' | 'publish_now' | 'reject' | 'submit_for_review',
    noticeId: number
  ) => {
    try {
      const response = await runAdminNoticeAction(session, {
        action,
        notice_id: noticeId,
        review_notes: reviewNotes[noticeId] || '',
      });

      Alert.alert('Notices', response.message || 'Action completed successfully.');
      onDirty();
      const refreshed = await fetchAdminNotices(session);
      setNotices(refreshed.notices);
    } catch (actionError) {
      Alert.alert('Notices', getApiErrorMessage(actionError, 'Could not update the notice.'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.sectionContent}>
      <SectionIntro title="Manage notices" subtitle="Moderate, publish, archive, and review notice activity." />

      <Panel>
        <Text style={styles.label}>Search</Text>
        <TextInput
          placeholder="Search notices by title or status"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={search}
          onChangeText={setSearch}
        />
      </Panel>

      {loading ? <LoadingState label="Loading notices..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {filtered.map((notice) => (
        <Panel key={notice.id}>
          <View style={styles.badgeRow}>
            <StatusBadge label={notice.status || 'draft'} />
            <StatusBadge label={notice.priority || 'normal'} />
            <StatusBadge label={notice.category || 'General'} />
            {notice.attachment ? <StatusBadge label="attachment" /> : null}
            {notice.latitude && notice.longitude ? <StatusBadge label="mapped" /> : null}
          </View>
          <Text style={styles.cardTitle}>{notice.title}</Text>
          <Text style={styles.cardBody} numberOfLines={4}>
            {notice.content}
          </Text>
          {notice.location_name ? (
            <Text style={styles.listMeta}>Location: {notice.location_name}</Text>
          ) : null}
          <Text style={styles.listMeta}>
            {notice.view_count || 0} views · {notice.bookmark_count || 0} bookmarks · {notice.ack_done || 0}/{notice.ack_total || 0} acknowledgements
          </Text>
          <TextInput
            placeholder="Optional review notes"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={reviewNotes[notice.id] || ''}
            onChangeText={(value) =>
              setReviewNotes((current) => ({ ...current, [notice.id]: value }))
            }
          />
          <View style={styles.buttonRow}>
            {session.role === 'admin' && notice.status === 'draft' ? (
              <ActionButton label="Submit" onPress={() => void runAction('submit_for_review', notice.id)} tone="accent" />
            ) : null}
            {session.role === 'super_admin' && (notice.status === 'draft' || notice.status === 'rejected') ? (
              <ActionButton label="Publish" onPress={() => void runAction('publish_now', notice.id)} tone="accent" />
            ) : null}
            {session.role === 'super_admin' && notice.status === 'pending_review' ? (
              <>
                <ActionButton label="Approve" onPress={() => void runAction('approve', notice.id)} tone="accent" />
                <ActionButton label="Reject" onPress={() => void runAction('reject', notice.id)} tone="warm" />
              </>
            ) : null}
            {notice.status !== 'archived' ? (
              <ActionButton label="Archive" onPress={() => void runAction('archive', notice.id)} tone="navy" />
            ) : null}
            {notice.attachment ? (
              <ActionButton label="Attachment" onPress={() => void openNoticeAttachment(notice)} tone="navy" />
            ) : null}
            <ActionButton label="Delete" onPress={() => void runAction('delete', notice.id)} tone="danger" />
          </View>
        </Panel>
      ))}
    </ScrollView>
  );
}

export function CreateNoticeSection({ isActive, onDirty, refreshToken, session }: BaseProps) {
  const [metadata, setMetadata] = useState<Awaited<ReturnType<typeof fetchAdminNotices>> | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Academic');
  const [priority, setPriority] = useState('normal');
  const [facultyTarget, setFacultyTarget] = useState<number | null>(session.role === 'admin' ? session.faculty_id || null : null);
  const [yearTarget, setYearTarget] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [ackDate, setAckDate] = useState('');
  const [pinned, setPinned] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);
  const [inAppChannel, setInAppChannel] = useState(true);
  const [emailChannel, setEmailChannel] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [recurringTemplate, setRecurringTemplate] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('');
  const [attachment, setAttachment] = useState<UploadAsset | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [radiusKm, setRadiusKm] = useState('1');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;
    async function load() {
      try {
        const response = await fetchAdminNotices(session);
        if (isMounted) {
          setMetadata(response);
          if (response.categories.length > 0) {
            setCategory((current) => current || response.categories[0]);
          }
        }
      } catch {
        // Form metadata is optional enough to fail quietly here.
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [isActive, refreshToken, session]);

  useEffect(() => {
    if (locationEnabled && category === 'Academic') {
      setCategory('Event');
    }
  }, [category, locationEnabled]);

  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: [
          'image/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setAttachment({
        mimeType: asset.mimeType || 'application/octet-stream',
        name: asset.name,
        uri: asset.uri,
      });
    } catch (pickError) {
      Alert.alert('Attachment', getApiErrorMessage(pickError, 'Could not pick that file.'));
    }
  };

  const useCurrentLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location', 'Location permission is required to fill the event coordinates.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const reverse = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      }).catch(() => []);

      const firstAddress = reverse[0];
      setLatitude(String(current.coords.latitude));
      setLongitude(String(current.coords.longitude));
      if (!locationName) {
        setLocationName(firstAddress?.name || 'Campus event point');
      }
      if (!locationAddress) {
        setLocationAddress(
          [firstAddress?.street, firstAddress?.district, firstAddress?.city].filter(Boolean).join(', ')
        );
      }
      setLocationEnabled(true);
    } catch (locationError) {
      Alert.alert('Location', getApiErrorMessage(locationError, 'Could not get the current location.'));
    }
  };

  const submitNotice = async (submissionAction: 'publish' | 'save_draft' | 'submit') => {
    setSaving(true);
    try {
      const response = await createAdminNotice(session, {
        acknowledgement_due_at: ackDate,
        attachment,
        category,
        content,
        delivery_channels: [
          ...(inAppChannel ? ['in_app'] : []),
          ...(emailChannel ? ['email'] : []),
        ],
        event_date: locationEnabled ? eventDate : null,
        event_end_date: locationEnabled ? eventEndDate : null,
        expire_date: expireDate,
        faculty_target: facultyTarget,
        is_location_event: locationEnabled,
        is_pinned: pinned,
        is_recurring_template: recurringTemplate,
        latitude: locationEnabled && latitude !== '' ? Number(latitude) : null,
        location_address: locationEnabled ? locationAddress : null,
        location_name: locationEnabled ? locationName : null,
        longitude: locationEnabled && longitude !== '' ? Number(longitude) : null,
        priority,
        radius_km: locationEnabled && radiusKm !== '' ? Number(radiusKm) : null,
        recurrence_pattern: recurrencePattern,
        requires_acknowledgement: requiresAck,
        save_as_template: saveAsTemplate,
        schedule_date: scheduleDate,
        submission_action: submissionAction,
        template_name: templateName,
        title,
        year_target: yearTarget,
      });

      Alert.alert('Notice', response.message || 'Notice saved successfully.');
      setTitle('');
      setContent('');
      setScheduleDate('');
      setExpireDate('');
      setAckDate('');
      setPinned(false);
      setRequiresAck(false);
      setEmailChannel(false);
      setSaveAsTemplate(false);
      setTemplateName('');
      setRecurringTemplate(false);
      setRecurrencePattern('');
      setAttachment(null);
      setLocationEnabled(false);
      setLatitude('');
      setLongitude('');
      setLocationName('');
      setLocationAddress('');
      setRadiusKm('1');
      setEventDate('');
      setEventEndDate('');
      onDirty();
    } catch (saveError) {
      Alert.alert('Notice', getApiErrorMessage(saveError, 'Could not save this notice.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.sectionContent}>
      <SectionIntro title="Create notice" subtitle="Publish a native notice without leaving the app." />

      <Panel>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />
        <Text style={styles.label}>Content</Text>
        <TextInput multiline style={[styles.input, styles.textArea]} value={content} onChangeText={setContent} />
        <Text style={styles.label}>Category</Text>
        <View style={styles.wrapRow}>
          {(metadata?.categories || ['Academic', 'Event', 'Exam', 'General']).map((item) => (
            <ChoicePill key={item} active={category === item} label={item} onPress={() => setCategory(item)} />
          ))}
        </View>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.wrapRow}>
          {['normal', 'high', 'critical'].map((item) => (
            <ChoicePill key={item} active={priority === item} label={item} onPress={() => setPriority(item)} />
          ))}
        </View>
        <Text style={styles.label}>Target faculty</Text>
        <View style={styles.wrapRow}>
          <ChoicePill active={facultyTarget === null} label="All faculties" onPress={() => setFacultyTarget(null)} />
          {(metadata?.faculties || []).map((faculty) => (
            <ChoicePill
              key={faculty.id}
              active={facultyTarget === faculty.id}
              label={faculty.name}
              onPress={() => setFacultyTarget(faculty.id)}
            />
          ))}
        </View>
        <Text style={styles.label}>Target year</Text>
        <View style={styles.wrapRow}>
          <ChoicePill active={yearTarget === null} label="All years" onPress={() => setYearTarget(null)} />
          {[1, 2, 3, 4].map((item) => (
            <ChoicePill
              key={item}
              active={yearTarget === item}
              label={`Year ${item}`}
              onPress={() => setYearTarget(item)}
            />
          ))}
        </View>
        <Text style={styles.label}>Schedule publish at</Text>
        <TextInput
          placeholder="YYYY-MM-DD HH:MM"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={scheduleDate}
          onChangeText={setScheduleDate}
        />
        <Text style={styles.label}>Expiry date</Text>
        <TextInput
          placeholder="YYYY-MM-DD"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={expireDate}
          onChangeText={setExpireDate}
        />
        <Text style={styles.label}>Attachment</Text>
        <Pressable style={styles.filePicker} onPress={() => void pickAttachment()}>
          <Text style={styles.filePickerText}>
            {attachment ? attachment.name : 'Pick image, PDF, or document'}
          </Text>
        </Pressable>
        <ToggleRow label="Pin this notice" value={pinned} onValueChange={setPinned} />
        <ToggleRow label="Requires acknowledgement" value={requiresAck} onValueChange={setRequiresAck} />
        {requiresAck ? (
          <>
            <Text style={styles.label}>Acknowledgement deadline</Text>
            <TextInput
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={ackDate}
              onChangeText={setAckDate}
            />
          </>
        ) : null}
        <ToggleRow label="In-app delivery" value={inAppChannel} onValueChange={setInAppChannel} />
        <ToggleRow label="Email delivery" value={emailChannel} onValueChange={setEmailChannel} />
        <ToggleRow label="Location event" value={locationEnabled} onValueChange={setLocationEnabled} />
        {locationEnabled ? (
          <>
            <Pressable style={styles.helperButton} onPress={() => void useCurrentLocation()}>
              <Text style={styles.helperButtonText}>Use my current location</Text>
            </Pressable>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="e.g. -1.286389"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={latitude}
              onChangeText={setLatitude}
            />
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="e.g. 36.817223"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={longitude}
              onChangeText={setLongitude}
            />
            <Text style={styles.label}>Location name</Text>
            <TextInput
              placeholder="Library block, Main hall, Sports field"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={locationName}
              onChangeText={setLocationName}
            />
            <Text style={styles.label}>Location address</Text>
            <TextInput
              placeholder="Optional detailed address"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={locationAddress}
              onChangeText={setLocationAddress}
            />
            <Text style={styles.label}>Nearby alert radius (km)</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={radiusKm}
              onChangeText={setRadiusKm}
            />
            <Text style={styles.label}>Event start</Text>
            <TextInput
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={eventDate}
              onChangeText={setEventDate}
            />
            <Text style={styles.label}>Event end</Text>
            <TextInput
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={eventEndDate}
              onChangeText={setEventEndDate}
            />
          </>
        ) : null}
        <ToggleRow label="Save as template" value={saveAsTemplate} onValueChange={setSaveAsTemplate} />
        {saveAsTemplate ? (
          <>
            <Text style={styles.label}>Template name</Text>
            <TextInput style={styles.input} value={templateName} onChangeText={setTemplateName} />
            <ToggleRow label="Recurring template" value={recurringTemplate} onValueChange={setRecurringTemplate} />
            {recurringTemplate ? (
              <>
                <Text style={styles.label}>Recurrence pattern</Text>
                <View style={styles.wrapRow}>
                  {Object.entries(metadata?.recurrence_options || { weekly: 'Weekly', monthly: 'Monthly', semester: 'Semester' }).map(([value, label]) => (
                    <ChoicePill
                      key={value}
                      active={recurrencePattern === value}
                      label={label}
                      onPress={() => setRecurrencePattern(value)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
        <View style={styles.buttonRow}>
          <ActionButton label={saving ? 'Saving...' : 'Save draft'} onPress={() => void submitNotice('save_draft')} tone="navy" />
          <ActionButton
            label={session.role === 'super_admin' ? 'Publish notice' : 'Submit for review'}
            onPress={() => void submitNotice(session.role === 'super_admin' ? 'publish' : 'submit')}
            tone="accent"
          />
        </View>
      </Panel>
    </ScrollView>
  );
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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
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
    <Pressable style={[styles.choicePill, active ? styles.choicePillActive : null]} onPress={onPress}>
      <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>{label}</Text>
    </Pressable>
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

function ActionButton({
  label,
  onPress,
  tone,
}: {
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
    <Pressable style={[styles.button, { backgroundColor: colors[tone] }]} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.stateCard}>
      <ActivityIndicator color={palette.accent} />
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.stateCard}>
      <Text style={[styles.mutedText, { color: palette.danger }]}>{message}</Text>
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

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#edf3f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  button: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  cardBody: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 12,
  },
  filePicker: {
    backgroundColor: '#edf3f9',
    borderColor: palette.line,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  filePickerText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '600',
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
  headline: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: '900',
  },
  helperButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#edf3f9',
    borderRadius: 14,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  helperButtonText: {
    color: palette.navy,
    fontSize: 13,
    fontWeight: '800',
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
  listMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  listRow: {
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  listTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  metricCard: {
    backgroundColor: '#edf3f9',
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
  mutedText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  panel: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 18,
  },
  sectionContent: {
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
    marginBottom: 4,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 24,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  textArea: {
    minHeight: 160,
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
