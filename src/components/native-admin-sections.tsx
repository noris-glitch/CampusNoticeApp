import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useDeferredValue, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createAdminNotice, fetchAdminNotices, runAdminNoticeAction } from '@/config/api-admin';
import { fetchBootstrap } from '@/config/api-auth';
import { analyticsReportUrl, downloadAnalyticsReportPdf, getApiErrorMessage } from '@/config/api-analytics';
import { noticeAttachmentUrl } from '@/config/api-core';
import type { AdminDashboardData, NoticeItem, StoredUser, UploadAsset } from '@/config/api-types';

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

interface CreateNoticeSectionProps extends BaseProps {
  mode?: 'location' | 'notice';
}

export function AdminDashboardSection({
  dashboard: initialDashboard,
  isActive = true,
  refreshToken = 0,
  session,
}: {
  dashboard?: AdminDashboardData | null;
  isActive?: boolean;
  refreshToken?: number;
  session: StoredUser;
}) {
  const [range, setRange] = useState<'daily' | 'monthly' | 'weekly'>('weekly');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(initialDashboard || null);
  const [loading, setLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(formatApiDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [reportEndDate, setReportEndDate] = useState(formatApiDate(new Date()));

  useEffect(() => {
    setDashboard(initialDashboard || null);
  }, [initialDashboard]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;
    async function loadAnalytics() {
      setLoading(true);
      try {
        const response = await fetchBootstrap(session, range);
        if (isMounted && response.dashboard) {
          setDashboard(response.dashboard as AdminDashboardData);
        }
      } catch {
        // Preserve the most recent working dashboard snapshot.
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, [isActive, range, refreshToken, session]);

  const generateAnalyticsReportHtml = () => {
    if (!dashboard) {
      throw new Error('Dashboard data is not ready yet.');
    }

    return buildAnalyticsReportHtml(dashboard, range, session);
  };

  const reportRequest = {
    analyticsRange: range,
    dateFrom: reportStartDate || null,
    dateTo: reportEndDate || null,
  } as const;

  const printAnalyticsReport = async () => {
    if (reporting) {
      return;
    }

    setReporting(true);
    try {
      if (Platform.OS === 'web') {
        await WebBrowser.openBrowserAsync(analyticsReportUrl(session, reportRequest));
        return;
      }

      const pdfFile = await downloadAnalyticsReportPdf(session, reportRequest);
      await Print.printAsync({ uri: pdfFile.uri });
    } catch (error) {
      try {
        await Print.printAsync({ html: generateAnalyticsReportHtml() });
      } catch (fallbackError) {
        Alert.alert(
          'Analytics report',
          getApiErrorMessage(error || fallbackError, 'Could not open the print dialog.')
        );
      }
    } finally {
      setReporting(false);
    }
  };

  const exportAnalyticsReport = async () => {
    if (reporting) {
      return;
    }

    setReporting(true);
    try {
      if (Platform.OS === 'web') {
        await WebBrowser.openBrowserAsync(analyticsReportUrl(session, reportRequest));
        return;
      }

      const pdfFile = await downloadAnalyticsReportPdf(session, reportRequest);
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(pdfFile.uri, {
          dialogTitle: 'Share analytics report',
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
        return;
      }

      Alert.alert('Analytics report', `PDF saved to ${pdfFile.uri}`);
    } catch (error) {
      try {
        const html = generateAnalyticsReportHtml();
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();

        if (canShare) {
          await Sharing.shareAsync(uri, {
            dialogTitle: 'Share analytics report',
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
          });
          return;
        }

        Alert.alert('Analytics report', `PDF saved to ${uri}`);
      } catch (fallbackError) {
        Alert.alert(
          'Analytics report',
          getApiErrorMessage(error || fallbackError, 'Could not generate the report PDF.')
        );
      }
    } finally {
      setReporting(false);
    }
  };

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
      <Panel>
        <Text style={styles.sectionTitle}>Analytics trend</Text>
        <View style={styles.wrapRow}>
          {(['daily', 'weekly', 'monthly'] as const).map((option) => (
            <ChoicePill key={option} active={range === option} label={option} onPress={() => setRange(option)} />
          ))}
        </View>
        <Text style={styles.helperText}>Export period</Text>
        <DateSelectionField
          label="Report start"
          mode="date"
          onChange={setReportStartDate}
          placeholder="Select start date"
          value={reportStartDate}
        />
        <DateSelectionField
          label="Report end"
          mode="date"
          onChange={setReportEndDate}
          placeholder="Select end date"
          value={reportEndDate}
        />
        <View style={styles.buttonRow}>
          <ActionButton
            label={reporting ? 'Preparing...' : 'Print report'}
            disabled={reporting}
            onPress={() => void printAnalyticsReport()}
            tone="navy"
          />
          <ActionButton
            label={reporting ? 'Preparing...' : 'Save PDF'}
            disabled={reporting}
            onPress={() => void exportAnalyticsReport()}
            tone="accent"
          />
        </View>
        {loading ? <Text style={styles.mutedText}>Refreshing analytics...</Text> : null}
        <AnalyticsSummary dashboard={dashboard} />
      </Panel>

      <View style={styles.metricGrid}>
        <MetricCard label="Notices" value={dashboard.total_notices} />
        <MetricCard label="Students" value={dashboard.total_students} />
        <MetricCard label="Views" value={dashboard.total_views} />
        <MetricCard label="Bookmarks" value={dashboard.total_bookmarks} />
        <MetricCard label="Pending" value={dashboard.pending_approvals} />
        <MetricCard label="Questions" value={dashboard.open_questions} />
      </View>

      <Panel>
        <Text style={styles.sectionTitle}>Reports</Text>
        <Text style={styles.listMeta}>Total notices posted: {dashboard.reports?.total_notices_posted || 0}</Text>
        <Text style={[styles.listMeta, { marginTop: 4 }]}>Most viewed notices</Text>
        {(dashboard.reports?.most_viewed_notices || []).slice(0, 5).map((notice, index) => (
          <View key={notice.id} style={styles.listRow}>
            <Text style={styles.listTitle}>{index + 1}. {notice.title}</Text>
            <Text style={styles.listMeta}>{notice.views} views</Text>
          </View>
        ))}
        <Text style={[styles.listMeta, { marginTop: 8 }]}>Department activity</Text>
        {(dashboard.reports?.department_activity || []).slice(0, 5).map((department) => (
          <View key={department.id} style={styles.listRow}>
            <Text style={styles.listTitle}>{department.name}</Text>
            <Text style={styles.listMeta}>
              {department.notices_posted} notices · {department.engagements} engagements
            </Text>
          </View>
        ))}
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Notice audit trail</Text>
        <Text style={styles.bodyText}>
          Recent notice creation, update, publish, approval, archive, and deletion activity.
        </Text>
        {(dashboard.notice_audit_trail || []).length === 0 ? (
          <Text style={styles.mutedText}>No audit entries yet.</Text>
        ) : (
          (dashboard.notice_audit_trail || []).map((entry) => (
            <View key={entry.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>
                  {formatNoticeAuditAction(entry.action)} · {entry.notice_title}
                </Text>
                <Text style={styles.listMeta}>
                  {entry.actor_name}
                  {entry.actor_role ? ` · ${entry.actor_role}` : ''}
                  {' · '}
                  {formatDateLabel(entry.created_at)}
                </Text>
                {entry.details ? <Text style={styles.helperText}>{entry.details}</Text> : null}
              </View>
              {entry.after_status ? (
                <View style={styles.auditStatusPill}>
                  <Text style={styles.auditStatusText}>{entry.after_status}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </Panel>

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
        {(dashboard.recent_students || []).length === 0 ? (
          <Text style={styles.mutedText}>No recent student activity.</Text>
        ) : (
          (dashboard.recent_students || []).map((student) => (
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

function AnalyticsSummary({ dashboard }: { dashboard: AdminDashboardData }) {
  const series = dashboard.analytics?.series as Record<string, { labels?: number[] | string[]; points?: number[] }> | undefined;
  const [selectedMetric, setSelectedMetric] = useState('logins');

  const fallbackPoints = [0, 0, 0, 0, 0, 0, 0];
  const hasSeries = Boolean(series && Object.keys(series).length > 0);
  const safeSeries: Record<string, { labels?: number[] | string[]; points?: number[] }> = series || {};

  const seriesPoints = (key: string): number[] => {
    if (!hasSeries) {
      return fallbackPoints;
    }
    const raw = safeSeries[key]?.points;
    if (!Array.isArray(raw)) {
      return fallbackPoints;
    }
    const normalized = raw.map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0));
    return normalized.length > 0 ? normalized : fallbackPoints;
  };

  const metrics = [
    { key: 'logins', label: 'Logins', points: seriesPoints('logins') },
    { key: 'notices_viewed', label: 'Views', points: seriesPoints('notices_viewed') },
    { key: 'notices_posted', label: 'Posted', points: seriesPoints('notices_posted') },
    { key: 'notice_downloads', label: 'Downloads', points: seriesPoints('notice_downloads') },
    { key: 'notice_comments', label: 'Comments', points: seriesPoints('notice_comments') },
    { key: 'active_users', label: 'Active users', points: seriesPoints('active_users') },
    { key: 'notifications_read', label: 'Notif read', points: seriesPoints('notifications_read') },
  ];

  const activeMetric = metrics.find((item) => item.key === selectedMetric) || metrics[0];

  return (
    <View style={{ marginTop: 10 }}>
      {!hasSeries ? <Text style={styles.mutedText}>Analytics source is syncing. Showing baseline timeline.</Text> : null}
      <View style={styles.wrapRow}>
        {metrics.map((metric) => (
          <ChoicePill
            key={metric.key}
            active={metric.key === activeMetric.key}
            label={metric.label}
            onPress={() => setSelectedMetric(metric.key)}
          />
        ))}
      </View>
      <LineGraph points={activeMetric.points} />
      {metrics.map((metric) => (
        <View key={metric.key} style={styles.listRow}>
          <Text style={styles.listTitle}>{metric.label}</Text>
          <Text style={styles.listMeta}>{drawSparkline(metric.points)} ({metric.points.reduce((a, b) => a + b, 0)})</Text>
        </View>
      ))}
    </View>
  );
}

function LineGraph({ points }: { points: number[] }) {
  if (!points.length) {
    return <Text style={styles.mutedText}>No points to plot for this range.</Text>;
  }

  const chartWidth = 300;
  const chartHeight = 140;
  const padX = 12;
  const padY = 12;
  const plotW = chartWidth - padX * 2;
  const plotH = chartHeight - padY * 2;
  const maxValue = Math.max(...points, 1);
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;

  const coords = points.map((value, index) => ({
    x: padX + index * stepX,
    y: padY + (1 - value / maxValue) * plotH,
    value,
  }));

  return (
    <View style={styles.lineGraphFrame}>
      <View style={styles.lineGraphGrid} />
      {coords.slice(0, -1).map((from, index) => {
        const to = coords[index + 1];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const midX = from.x + dx / 2;
        const midY = from.y + dy / 2;
        return (
          <View
            key={`segment-${index}`}
            style={[
              styles.lineSegment,
              {
                left: midX - length / 2,
                top: midY - 1,
                transform: [{ rotateZ: `${angle}deg` }],
                width: length,
              },
            ]}
          />
        );
      })}
      {coords.map((point, index) => (
        <View key={`dot-${index}`} style={[styles.lineDot, { left: point.x - 3, top: point.y - 3 }]} />
      ))}
      <Text style={styles.lineGraphMax}>Max {maxValue}</Text>
    </View>
  );
}

function drawSparkline(points: number[]): string {
  if (points.length === 0) {
    return '-';
  }

  const ticks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const max = Math.max(...points, 1);
  return points
    .map((point) => ticks[Math.max(0, Math.min(ticks.length - 1, Math.round((point / max) * (ticks.length - 1))))])
    .join('');
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

export function CreateNoticeSection({
  isActive,
  mode = 'notice',
  onDirty,
  refreshToken,
  session,
}: CreateNoticeSectionProps) {
  const isLocationOnly = mode === 'location';
  const defaultCategory = isLocationOnly ? 'Event' : 'Academic';
  const defaultFacultyTarget = session.role === 'admin' ? session.faculty_id || null : null;
  const [metadata, setMetadata] = useState<Awaited<ReturnType<typeof fetchAdminNotices>> | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [priority, setPriority] = useState('normal');
  const [facultyTarget, setFacultyTarget] = useState<number | null>(defaultFacultyTarget);
  const [departmentTarget, setDepartmentTarget] = useState<number | null>(null);
  const [yearTarget, setYearTarget] = useState<number | null>(null);
  const [selectedAudienceRoles, setSelectedAudienceRoles] = useState<('student' | 'admin' | 'super_admin')[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [ackDate, setAckDate] = useState('');
  const [pinned, setPinned] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);
  const [inAppChannel, setInAppChannel] = useState(true);
  const [emailChannel, setEmailChannel] = useState(false);
  const [smsChannel, setSmsChannel] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [recurringTemplate, setRecurringTemplate] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('');
  const [attachment, setAttachment] = useState<UploadAsset | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(isLocationOnly);
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

  useEffect(() => {
    if (isLocationOnly) {
      setLocationEnabled(true);
      setCategory('Event');
    }
  }, [isLocationOnly]);

  const visibleDepartments = (metadata?.departments || []).filter(
    (department) =>
      facultyTarget === null || department.faculty_id === facultyTarget || department.faculty_id === null
  );
  const audienceRoleOptions = metadata?.audience_roles || {};
  const selectedFacultyName =
    facultyTarget === null
      ? 'All faculties'
      : metadata?.faculties.find((faculty) => faculty.id === facultyTarget)?.name || 'Selected faculty';
  const selectedDepartmentName =
    departmentTarget === null
      ? 'All departments'
      : visibleDepartments.find((department) => department.id === departmentTarget)?.name || 'Selected department';
  const selectedRoleLabel =
    selectedAudienceRoles.length === 0
      ? 'All roles'
      : selectedAudienceRoles.map((role) => audienceRoleOptions[role] || role).join(', ');
  const audienceSummary = `${selectedFacultyName} · ${selectedDepartmentName} · ${
    yearTarget === null ? 'All years' : `Year ${yearTarget}`
  } · ${selectedRoleLabel}`;

  useEffect(() => {
    if (departmentTarget === null) {
      return;
    }

    const stillVisible = visibleDepartments.some((department) => department.id === departmentTarget);
    if (!stillVisible) {
      setDepartmentTarget(null);
    }
  }, [departmentTarget, visibleDepartments]);

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

  const handleUseCurrentLocation = async () => {
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

  const resetNoticeForm = () => {
    setTitle('');
    setContent('');
    setCategory(defaultCategory);
    setPriority('normal');
    setFacultyTarget(defaultFacultyTarget);
    setDepartmentTarget(null);
    setYearTarget(null);
    setSelectedAudienceRoles([]);
    setScheduleDate('');
    setExpireDate('');
    setAckDate('');
    setPinned(false);
    setRequiresAck(false);
    setInAppChannel(true);
    setEmailChannel(false);
    setSmsChannel(false);
    setSaveAsTemplate(false);
    setTemplateName('');
    setRecurringTemplate(false);
    setRecurrencePattern('');
    setAttachment(null);
    setLocationEnabled(isLocationOnly);
    setLatitude('');
    setLongitude('');
    setLocationName('');
    setLocationAddress('');
    setRadiusKm('1');
    setEventDate('');
    setEventEndDate('');
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
          ...(smsChannel ? ['sms'] : []),
        ],
        department_target: departmentTarget,
        event_date: locationEnabled ? eventDate : null,
        event_end_date: locationEnabled ? eventEndDate : null,
        expire_date: expireDate,
        audience_roles: selectedAudienceRoles,
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

      let feedbackMessage = response.message || 'Notice saved successfully.';
      if (response.status === 'published') {
        const recipientCount = response.delivery_summary?.users ?? 0;
        feedbackMessage =
          recipientCount > 0
            ? `Notice published to ${recipientCount} user${recipientCount === 1 ? '' : 's'}.`
            : 'Notice was published, but no matching users can see it. Check faculty, department, year, and audience roles.';
      } else if (response.status === 'scheduled') {
        feedbackMessage = 'Notice scheduled successfully. Students will see it at the selected publish time.';
      } else if (response.status === 'pending_review') {
        feedbackMessage = 'Notice sent for review successfully.';
      }

      Alert.alert('Notice', feedbackMessage);
      resetNoticeForm();
      onDirty();
    } catch (saveError) {
      Alert.alert('Notice', getApiErrorMessage(saveError, 'Could not save this notice.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.sectionContent}>
      <SectionIntro
        title={isLocationOnly ? 'Create location event' : 'Create notice'}
        subtitle={
          isLocationOnly
            ? 'Publish a mapped campus event with coordinates, radius, and event timing.'
            : 'Publish a native notice without leaving the app.'
        }
      />

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
          <ChoicePill
            active={facultyTarget === null}
            label="All faculties"
            onPress={() => {
              setFacultyTarget(null);
              setDepartmentTarget(null);
            }}
          />
          {(metadata?.faculties || []).map((faculty) => (
            <ChoicePill
              key={faculty.id}
              active={facultyTarget === faculty.id}
              label={faculty.name}
              onPress={() => setFacultyTarget(faculty.id)}
            />
          ))}
        </View>
        <Text style={styles.label}>Target department</Text>
        <View style={styles.wrapRow}>
          <ChoicePill active={departmentTarget === null} label="All departments" onPress={() => setDepartmentTarget(null)} />
          {visibleDepartments.map((department) => (
            <ChoicePill
              key={department.id}
              active={departmentTarget === department.id}
              label={department.name}
              onPress={() => {
                setDepartmentTarget(department.id);
                if (department.faculty_id && facultyTarget === null) {
                  setFacultyTarget(department.faculty_id);
                }
              }}
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
        <Text style={styles.label}>Audience roles</Text>
        <View style={styles.wrapRow}>
          <ChoicePill
            active={selectedAudienceRoles.length === 0}
            label="All roles"
            onPress={() => setSelectedAudienceRoles([])}
          />
          {Object.entries(metadata?.audience_roles || {}).map(([value, label]) => {
            const roleValue = value as 'student' | 'admin' | 'super_admin';
            const active = selectedAudienceRoles.includes(roleValue);
            return (
              <ChoicePill
                key={value}
                active={active}
                label={label}
                onPress={() =>
                  setSelectedAudienceRoles((current) =>
                    active ? current.filter((item) => item !== roleValue) : [...current, roleValue]
                  )
                }
              />
            );
          })}
        </View>
        <Text style={styles.helperText}>Audience summary: {audienceSummary}</Text>
        <DateSelectionField
          helper="Leave this blank to publish immediately."
          label="Schedule publish at"
          mode="datetime"
          onChange={setScheduleDate}
          placeholder="Select publish date & time"
          value={scheduleDate}
        />
        <DateSelectionField
          helper="Optional. The notice stays visible until the end of the selected day."
          label="Expiry date"
          mode="date"
          onChange={setExpireDate}
          placeholder="Select expiry date"
          value={expireDate}
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
          <DateSelectionField
            helper="Students must acknowledge the notice before this time."
            label="Acknowledgement deadline"
            mode="datetime"
            onChange={setAckDate}
            placeholder="Select acknowledgement deadline"
            value={ackDate}
          />
        ) : null}
        <ToggleRow label="In-app delivery" value={inAppChannel} onValueChange={setInAppChannel} />
        <ToggleRow label="Email delivery" value={emailChannel} onValueChange={setEmailChannel} />
        <ToggleRow label="SMS delivery" value={smsChannel} onValueChange={setSmsChannel} />
        {smsChannel && metadata?.sms_gateway_ready === false ? (
          <Text style={styles.helperText}>
            {metadata.sms_gateway_message || 'SMS delivery is not configured on the server yet.'}
          </Text>
        ) : null}
        {isLocationOnly ? (
          <View style={styles.helperButton}>
            <Text style={styles.helperButtonText}>This screen publishes map-enabled location events.</Text>
          </View>
        ) : (
          <ToggleRow label="Location event" value={locationEnabled} onValueChange={setLocationEnabled} />
        )}
        {locationEnabled ? (
          <>
            <Pressable style={styles.helperButton} onPress={() => void handleUseCurrentLocation()}>
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
            <DateSelectionField
              helper="Optional, but recommended for map-enabled events."
              label="Event start"
              mode="datetime"
              onChange={setEventDate}
              placeholder="Select event start"
              value={eventDate}
            />
            <DateSelectionField
              label="Event end"
              mode="datetime"
              onChange={setEventEndDate}
              placeholder="Select event end"
              value={eventEndDate}
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
  disabled = false,
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
      style={[styles.button, { backgroundColor: colors[tone] }, disabled ? styles.buttonDisabled : null]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function parseApiDateInput(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const [datePart, timePart = '00:00:00'] = value.trim().split(' ');
  const [year, month, day] = datePart.split('-').map((item) => Number(item));
  const [hours = 0, minutes = 0] = timePart.split(':').map((item) => Number(item));

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function formatApiDate(value: Date) {
  return `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;
}

function formatApiDateTime(value: Date) {
  return `${formatApiDate(value)} ${padDatePart(value.getHours())}:${padDatePart(value.getMinutes())}`;
}

function formatPickerLabel(value: string, mode: 'date' | 'datetime', placeholder: string) {
  const parsed = parseApiDateInput(value);
  if (!parsed) {
    return placeholder;
  }

  if (mode === 'date') {
    return parsed.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      weekday: 'short',
      year: 'numeric',
    });
  }

  return parsed.toLocaleString('en-KE', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function openPickerField(options: {
  mode: 'date' | 'datetime';
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  if (Platform.OS !== 'android') {
    Alert.alert('Date and time', 'This picker is currently available on Android builds.');
    return;
  }

  const initialValue = parseApiDateInput(options.value) || new Date();

  DateTimePickerAndroid.open({
    is24Hour: true,
    mode: 'date',
    value: initialValue,
    onChange: (dateEvent, selectedDate) => {
      if (dateEvent.type !== 'set' || !selectedDate) {
        return;
      }

      if (options.mode === 'date') {
        selectedDate.setHours(0, 0, 0, 0);
        options.onChange(formatApiDate(selectedDate));
        return;
      }

      const seededTime = parseApiDateInput(options.value) || selectedDate;
      const timeBase = new Date(selectedDate);
      timeBase.setHours(seededTime.getHours(), seededTime.getMinutes(), 0, 0);

      DateTimePickerAndroid.open({
        is24Hour: true,
        mode: 'time',
        value: timeBase,
        onChange: (timeEvent, selectedTime) => {
          if (timeEvent.type !== 'set' || !selectedTime) {
            return;
          }

          const nextValue = new Date(selectedDate);
          nextValue.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
          options.onChange(formatApiDateTime(nextValue));
        },
      });
    },
  });
}

function DateSelectionField({
  helper,
  label,
  mode,
  onChange,
  placeholder,
  value,
}: {
  helper?: string;
  label: string;
  mode: 'date' | 'datetime';
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const hasValue = value.trim() !== '';

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectionRow}>
        <Pressable
          style={[styles.input, styles.selectionField]}
          onPress={() => openPickerField({ mode, onChange, placeholder, value })}
        >
          <Text style={hasValue ? styles.selectionValue : styles.selectionPlaceholder}>
            {formatPickerLabel(value, mode, placeholder)}
          </Text>
        </Pressable>
        {hasValue ? (
          <Pressable style={styles.clearButton} onPress={() => onChange('')}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {helper ? <Text style={styles.helperText}>{helper}</Text> : null}
    </>
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

function formatNoticeAuditAction(action: string) {
  return action
    .replace(/^mobile_/, '')
    .replace(/^notice_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatReportDate(value?: string | null) {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-KE', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildMetricRows(dashboard: AdminDashboardData): { label: string; points: number[]; total: number }[] {
  const series = dashboard.analytics?.series as Record<string, { points?: number[] }> | undefined;
  const safeSeries = series || {};
  const fallbackPoints = [0, 0, 0, 0, 0, 0, 0];

  const normalizePoints = (key: string) => {
    const raw = safeSeries[key]?.points;
    if (!Array.isArray(raw) || raw.length === 0) {
      return fallbackPoints;
    }
    return raw.map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0));
  };

  const rows = [
    { label: 'Logins', key: 'logins' },
    { label: 'Views', key: 'notices_viewed' },
    { label: 'Posted', key: 'notices_posted' },
    { label: 'Downloads', key: 'notice_downloads' },
    { label: 'Comments', key: 'notice_comments' },
    { label: 'Active users', key: 'active_users' },
    { label: 'Notif read', key: 'notifications_read' },
  ];

  return rows.map((row) => {
    const points = normalizePoints(row.key);
    return {
      label: row.label,
      points,
      total: points.reduce((sum, value) => sum + value, 0),
    };
  });
}

function buildAnalyticsReportHtml(
  dashboard: AdminDashboardData,
  analyticsRange: 'daily' | 'monthly' | 'weekly',
  session: StoredUser
): string {
  const generatedAt = new Date().toLocaleString('en-KE', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const reportRows = buildMetricRows(dashboard);
  const trendRows = reportRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          <td>${row.total.toLocaleString()}</td>
          <td>${escapeHtml(drawSparkline(row.points))}</td>
          <td>${row.points.reduce((sum, value) => sum + value, 0).toLocaleString()}</td>
        </tr>
      `
    )
    .join('');

  const topNotices = (dashboard.reports?.most_viewed_notices || [])
    .slice(0, 5)
    .map(
      (notice, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(notice.title)}</td>
          <td>${notice.views.toLocaleString()}</td>
        </tr>
      `
    )
    .join('');

  const departmentRows = (dashboard.reports?.department_activity || [])
    .slice(0, 5)
    .map(
      (department) => `
        <tr>
          <td>${escapeHtml(department.name)}</td>
          <td>${department.notices_posted.toLocaleString()}</td>
          <td>${department.engagements.toLocaleString()}</td>
          <td>${department.notice_views.toLocaleString()}</td>
          <td>${department.notice_comments.toLocaleString()}</td>
        </tr>
      `
    )
    .join('');

  const recentNotices = dashboard.recent_notices
    .slice(0, 5)
    .map(
      (notice) => `
        <li>
          <strong>${escapeHtml(notice.title)}</strong>
          <span>${escapeHtml(notice.category || 'General')} · ${escapeHtml(formatReportDate(notice.created_at))}</span>
        </li>
      `
    )
    .join('');

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @page { margin: 20px; }
        :root {
          color-scheme: light;
          --ink: #10253c;
          --muted: #5e7187;
          --accent: #0f7b6c;
          --line: #d9e3ef;
          --bg: #f5f8fc;
          --panel: #ffffff;
        }
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          color: var(--ink);
          background: var(--bg);
        }
        .page {
          padding: 20px;
        }
        .hero {
          background: linear-gradient(135deg, #17324d, #0f7b6c);
          color: #fff;
          border-radius: 20px;
          padding: 22px;
          margin-bottom: 16px;
        }
        .hero h1 {
          margin: 0 0 8px;
          font-size: 28px;
        }
        .hero p {
          margin: 0;
          opacity: 0.9;
          line-height: 1.5;
        }
        .meta {
          margin-top: 10px;
          font-size: 12px;
          opacity: 0.85;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px;
        }
        .card h2 {
          margin: 0 0 8px;
          font-size: 16px;
        }
        .stat {
          font-size: 28px;
          font-weight: 800;
          margin: 0;
        }
        .stat-label {
          color: var(--muted);
          margin-top: 4px;
          font-size: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border-bottom: 1px solid var(--line);
          padding: 10px 8px;
          text-align: left;
          vertical-align: top;
        }
        th {
          color: var(--muted);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        td {
          font-size: 13px;
        }
        ul {
          margin: 0;
          padding-left: 18px;
        }
        li {
          margin: 10px 0;
        }
        li span {
          display: block;
          color: var(--muted);
          font-size: 12px;
          margin-top: 3px;
        }
        .section {
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 10px;
        }
        .footer {
          color: var(--muted);
          font-size: 11px;
          margin-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="hero">
          <h1>Campus Notice Analytics Report</h1>
          <p>Prepared for decision making across notices, student activity, and department engagement.</p>
          <div class="meta">
            Generated ${escapeHtml(generatedAt)} · Range ${escapeHtml(analyticsRange)} · Prepared for ${escapeHtml(session.name)}
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <p class="stat">${dashboard.total_notices.toLocaleString()}</p>
            <div class="stat-label">Total notices</div>
          </div>
          <div class="card">
            <p class="stat">${dashboard.total_students.toLocaleString()}</p>
            <div class="stat-label">Students</div>
          </div>
          <div class="card">
            <p class="stat">${dashboard.total_views.toLocaleString()}</p>
            <div class="stat-label">Views</div>
          </div>
          <div class="card">
            <p class="stat">${dashboard.total_bookmarks.toLocaleString()}</p>
            <div class="stat-label">Bookmarks</div>
          </div>
        </div>

        <div class="section card">
          <h2 class="section-title">Analytics trend summary</h2>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Total</th>
                <th>Trend</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              ${trendRows}
            </tbody>
          </table>
        </div>

        <div class="section card">
          <h2 class="section-title">Top viewed notices</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Notice</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              ${topNotices || '<tr><td colspan="3">No report data available.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section card">
          <h2 class="section-title">Department activity</h2>
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Posted</th>
                <th>Engagements</th>
                <th>Views</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              ${departmentRows || '<tr><td colspan="5">No department activity available.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section card">
          <h2 class="section-title">Recent notices</h2>
          <ul>
            ${recentNotices || '<li>No recent notices available.</li>'}
          </ul>
        </div>

        <div class="footer">
          Open questions: ${dashboard.open_questions.toLocaleString()} · Pending approvals: ${dashboard.pending_approvals.toLocaleString()} · Report prepared by ${escapeHtml(session.email)}
        </div>
      </div>
    </body>
  </html>`;
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
  buttonDisabled: {
    opacity: 0.7,
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
  clearButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#edf3f9',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 14,
  },
  clearButtonText: {
    color: palette.navy,
    fontSize: 13,
    fontWeight: '800',
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
  helperText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  bodyText: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  auditStatusPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.warm,
    borderRadius: 999,
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  auditStatusText: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  lineDot: {
    backgroundColor: palette.accent,
    borderRadius: 999,
    height: 6,
    position: 'absolute',
    width: 6,
  },
  lineGraphFrame: {
    backgroundColor: '#f8fbff',
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    height: 140,
    marginTop: 10,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  lineGraphGrid: {
    borderBottomColor: '#e6eef8',
    borderBottomWidth: 1,
    borderTopColor: '#e6eef8',
    borderTopWidth: 1,
    height: '50%',
    left: 0,
    position: 'absolute',
    top: '25%',
    width: '100%',
  },
  lineGraphMax: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    position: 'absolute',
    right: 8,
    top: 6,
  },
  lineSegment: {
    backgroundColor: palette.accent,
    height: 2,
    position: 'absolute',
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
  selectionField: {
    flex: 1,
  },
  selectionPlaceholder: {
    color: palette.muted,
    fontSize: 15,
  },
  selectionRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 10,
  },
  selectionValue: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '600',
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
