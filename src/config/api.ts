import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { fetch as expoFetch } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';

export const API_BASE_URL = 'https://campus-notice.onrender.com';
export const WEB_BASE_URL = API_BASE_URL;
export const SESSION_STORAGE_KEY = 'campus_notice_session';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureApiObject<T>(value: unknown, fallback: string): T {
  if (isPlainObject(value)) {
    return value as T;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    throw new Error(value.trim());
  }

  throw new Error(fallback);
}

export const API_PATHS = {
  warmup: '/login.php',
  login: '/ajax/api/login.php',
  register: '/ajax/api/register.php',
  passwordReset: '/ajax/api/password_reset.php',
  feedback: '/ajax/api/feedback.php',
  bootstrap: '/ajax/api/bootstrap.php',
  notices: '/ajax/api/notices.php',
  noticeActions: '/ajax/api/notice_actions.php',
  notifications: '/ajax/api/notifications.php',
  bookmarks: '/ajax/api/bookmarks.php',
  archive: '/ajax/api/archive.php',
  profile: '/ajax/api/profile.php',
  adminNotices: '/ajax/api/admin_notices.php',
  locations: '/ajax/api/locations.php',
  emergencyAlerts: '/ajax/api/emergency_alerts.php',
  manageUsers: '/ajax/api/manage_users.php',
  studentSync: '/ajax/api/student_sync.php',
  shorts: '/ajax/api/shorts.php',
} as const;

export type UserRole = 'student' | 'admin' | 'super_admin';

export interface UploadAsset {
  fileSize?: number | null;
  mimeType?: string | null;
  name: string;
  uri: string;
}

export interface StoredUser {
  admin_type?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  email: string;
  faculty_id?: number | null;
  faculty_name?: string | null;
  membership?: string | null;
  name: string;
  phone_number?: string | null;
  profile_picture?: string | null;
  profile_picture_url?: string | null;
  role: UserRole;
  role_label?: string | null;
  student_id?: string | null;
  token: string;
  user_id: number;
  year?: number | null;
}

export interface FacultyOption {
  dean_name?: string | null;
  id: number;
  name: string;
}

export interface DepartmentOption {
  code?: string | null;
  faculty_id?: number | null;
  faculty_name?: string | null;
  id: number;
  name: string;
}

export interface YearOption {
  label: string;
  value: number;
}

export interface NoticeItem {
  acknowledgement_due_at?: string | null;
  acknowledgement_status?: string | null;
  ack_done?: number;
  ack_total?: number;
  approval_status?: string | null;
  attachment?: string | null;
  attachment_url?: string | null;
  author_name?: string | null;
  bookmark_count?: number;
  category?: string | null;
  content: string;
  created_at: string;
  delivery_channels?: string | null;
  email_failed?: number;
  email_sent?: number;
  event_date?: string | null;
  event_end_date?: string | null;
  expire_at?: string | null;
  faculty_target?: number | null;
  department_id?: number | null;
  department_name?: string | null;
  audience_roles_csv?: string | null;
  has_viewed?: number;
  id: number;
  is_bookmarked?: number;
  is_pinned?: number;
  latitude?: number | null;
  location_address?: string | null;
  location_name?: string | null;
  longitude?: number | null;
  open_questions?: number;
  posted_by?: number;
  priority?: string | null;
  publish_at?: string | null;
  radius_km?: number | null;
  recurrence_pattern?: string | null;
  requires_acknowledgement?: number;
  review_notes?: string | null;
  sms_failed?: number;
  sms_sent?: number;
  status?: string | null;
  template_id?: number | null;
  title: string;
  target_faculty_name?: string | null;
  view_count?: number;
  year_target?: number | null;
}

export interface NoticeCommentItem {
  answer?: string | null;
  answered_at?: string | null;
  answered_by?: number | null;
  answerer_name?: string | null;
  asked_by: number;
  asker_name: string;
  created_at: string;
  id: number;
  notice_id: number;
  question: string;
  status: string;
}

export interface NoticeDetailResponse {
  can_comment: boolean;
  can_moderate_comments: boolean;
  comments: NoticeCommentItem[];
  notice: NoticeItem;
  success: boolean;
}

export interface ShortItem {
  approval_status?: string | null;
  audience_roles_csv?: string | null;
  author_name?: string | null;
  author_role?: UserRole | null;
  can_manage?: number;
  can_review?: number;
  caption: string;
  created_at: string;
  department_id?: number | null;
  department_name?: string | null;
  duration_seconds: number;
  faculty_name?: string | null;
  faculty_target?: number | null;
  has_viewed?: number;
  id: number;
  posted_by?: number;
  status?: string | null;
  title?: string | null;
  video_filename: string;
  view_count?: number;
  year_target?: number | null;
}

export interface NotificationItem {
  created_at: string;
  id: number;
  is_read: number;
  message: string;
  notice_id?: number | null;
  notice_title?: string | null;
  time_ago?: string | null;
  title: string;
}

export interface StudentDashboardData {
  bookmark_count: number;
  recent_notices: NoticeItem[];
  unread_count: number;
  urgent_count: number;
  viewed_count: number;
}

export interface AdminDashboardData {
  open_questions: number;
  pending_approvals: number;
  recent_notices: NoticeItem[];
  recent_students: Array<{
    created_at: string;
    email: string;
    id: number;
    name: string;
    year?: number | null;
  }>;
  total_bookmarks: number;
  total_notices: number;
  total_students: number;
  total_views: number;
}

export interface BootstrapResponse {
  categories: string[];
  dashboard: AdminDashboardData | StudentDashboardData;
  departments?: DepartmentOption[];
  faculties: FacultyOption[];
  success: boolean;
  unread_notifications: number;
  user: StoredUser;
}

export interface FeedbackItem {
  admin_response?: string | null;
  category: string;
  created_at: string;
  id: number;
  message: string;
  responded_at?: string | null;
  responded_by?: number | null;
  responder_name?: string | null;
  status: string;
  subject: string;
  submitted_by: number;
  submitter_email?: string | null;
  submitter_name?: string | null;
  updated_at?: string | null;
}

export interface FeedbackResponse {
  can_moderate: boolean;
  categories: string[];
  items: FeedbackItem[];
  stats: {
    closed: number;
    in_review: number;
    open: number;
    responded: number;
    total: number;
  };
  statuses: Record<string, string>;
  success: boolean;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  success: boolean;
  unread_count: number;
}

export interface NoticesResponse {
  notices: NoticeItem[];
  success: boolean;
}

export interface ProfileResponse {
  categories: string[];
  departments: DepartmentOption[];
  faculties: FacultyOption[];
  notification_preferences: {
    categories: string[];
    email_enabled: number;
    emergency_override: number;
    in_app_enabled: number;
    quiet_hours_end?: string | null;
    quiet_hours_start?: string | null;
    sms_enabled: number;
  };
  stats: {
    bookmark_count: number;
    notice_count: number;
    viewed_count: number;
  };
  success: boolean;
  user: StoredUser;
}

export interface TemplateOption {
  audience_roles_csv?: string | null;
  author_name?: string | null;
  category?: string | null;
  content: string;
  default_priority?: string | null;
  delivery_channels?: string | null;
  department_id?: number | null;
  faculty_target?: number | null;
  id: number;
  is_pinned?: number;
  is_recurring?: number;
  name: string;
  recurrence_pattern?: string | null;
  requires_acknowledgement?: number;
  title: string;
  year_target?: number | null;
}

export interface AdminNoticesResponse {
  audience_roles: Record<string, string>;
  categories: string[];
  departments: DepartmentOption[];
  faculties: FacultyOption[];
  notices: NoticeItem[];
  priorities: Record<string, string>;
  recurrence_options: Record<string, string>;
  sms_gateway_message?: string | null;
  sms_gateway_ready?: boolean;
  success: boolean;
  templates: TemplateOption[];
  years: Array<{ label: string; value: number }>;
}

export interface RegistrationOptionsResponse {
  departments: DepartmentOption[];
  faculties: FacultyOption[];
  success: boolean;
  years: YearOption[];
}

export interface SharedLocation {
  latitude: number;
  location_address?: string | null;
  location_name?: string | null;
  longitude: number;
  updated_at?: string | null;
}

export interface LocationEventItem extends NoticeItem {
  distance?: number | null;
}

export interface LocationHubResponse {
  events: LocationEventItem[];
  nearby_events: LocationEventItem[];
  success: boolean;
  supported: boolean;
  user_location: SharedLocation | null;
}

export interface EmergencyAlertItem {
  author_name?: string | null;
  created_at: string;
  expires_at?: string | null;
  id: number;
  is_active: number;
  message: string;
  read_count: number;
  severity: string;
  target_faculty?: number | null;
  target_year?: number | null;
  title: string;
  total_recipients: number;
}

export interface EmergencyAlertsResponse {
  active_count: number;
  alerts: EmergencyAlertItem[];
  faculties: FacultyOption[];
  severities: Record<string, string>;
  success: boolean;
  years: YearOption[];
}

export interface ManagedUserItem {
  admin_type?: string | null;
  can_post_shorts?: number;
  created_at: string;
  department_id?: number | null;
  department_name?: string | null;
  email: string;
  faculty_id?: number | null;
  faculty_name?: string | null;
  id: number;
  is_active: number;
  membership?: string | null;
  name: string;
  phone_number?: string | null;
  role: UserRole;
  shorts_authorized_at?: string | null;
  shorts_authorized_by?: number | null;
  student_id?: string | null;
  year?: number | null;
}

export interface ManageUsersResponse {
  admin_types: Record<string, string>;
  departments: DepartmentOption[];
  faculties: FacultyOption[];
  stats: {
    active_users: number;
    authorized_short_creators?: number;
    students_missing_departments?: number;
    students_missing_phone_numbers?: number;
    total_admins: number;
    total_students: number;
    total_super_admins: number;
    total_users: number;
  };
  success: boolean;
  users: ManagedUserItem[];
  years: YearOption[];
}

export interface StudentSyncResponse {
  backfill_summary?: {
    missing_both: number;
    missing_departments: number;
    missing_phone_numbers: number;
    ready_profiles: number;
    samples: Array<{
      email: string;
      faculty_name?: string | null;
      id: number;
      name: string;
      phone_number?: string | null;
      student_id?: string | null;
    }>;
    total_students: number;
  };
  issues: string[];
  message?: string;
  note?: string;
  sample_columns: string[];
  skipped: number;
  success: boolean;
  updated: number;
}

export interface ShortsResponse {
  audience_roles: Record<string, string>;
  departments: DepartmentOption[];
  faculties: FacultyOption[];
  moderation_summary?: {
    pending_review: number;
    published: number;
    rejected: number;
  };
  pending_shorts?: ShortItem[];
  permissions?: {
    can_post: number;
    can_review: number;
    feed_is_super_admin_only: number;
  };
  shorts: ShortItem[];
  student_scope_locked?: boolean;
  success: boolean;
  years: YearOption[];
}

export interface SimpleSuccessResponse {
  action?: string;
  delivery_summary?: {
    email_failed: number;
    email_sent: number;
    in_app: number;
    sms_failed: number;
    sms_sent: number;
    users: number;
  } | null;
  error?: string;
  message?: string;
  notice_id?: number;
  short_id?: number;
  reset_token?: string;
  expires_at?: string;
  result?: {
    decision: string;
    status: string;
  };
  status?: string;
  success: boolean;
  user?: StoredUser;
  errors?: string[];
}

export interface CreateAdminNoticePayload {
  acknowledgement_due_at?: string | null;
  attachment?: UploadAsset | null;
  audience_roles?: UserRole[];
  category: string;
  content: string;
  delivery_channels: string[];
  department_target?: number | null;
  event_date?: string | null;
  event_end_date?: string | null;
  expire_date?: string | null;
  faculty_target?: number | null;
  is_location_event?: boolean;
  is_pinned?: boolean;
  is_recurring_template?: boolean;
  latitude?: number | null;
  location_address?: string | null;
  location_name?: string | null;
  longitude?: number | null;
  priority: string;
  radius_km?: number | null;
  recurrence_pattern?: string | null;
  requires_acknowledgement?: boolean;
  save_as_template?: boolean;
  schedule_date?: string | null;
  submission_action: 'publish' | 'save_draft' | 'submit';
  template_id?: number | null;
  template_name?: string | null;
  title: string;
  year_target?: number | null;
}

export interface CreateShortPayload {
  audience_roles?: UserRole[];
  caption: string;
  department_target?: number | null;
  duration_seconds: number;
  faculty_target?: number | null;
  title?: string | null;
  video: UploadAsset;
  year_target?: number | null;
}

function authParams(user: StoredUser) {
  return {
    token: user.token,
    user_id: user.user_id,
  };
}

async function getRequest<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<T>(path, { params });
  return ensureApiObject<T>(response.data, 'The server returned an unexpected response.');
}

async function postRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await apiClient.post<T>(path, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return ensureApiObject<T>(response.data, 'The server returned an unexpected response.');
}

function appendFormValue(formData: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null || value === '') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item !== undefined && item !== null && item !== '') {
        formData.append(`${key}[]`, String(item));
      }
    });
    return;
  }

  if (typeof value === 'boolean') {
    formData.append(key, value ? '1' : '0');
    return;
  }

  formData.append(key, String(value));
}

function appendUploadAsset(formData: FormData, field: string, asset?: UploadAsset | null): void {
  if (!asset) {
    return;
  }

  formData.append(field, buildUploadFile(asset, field));
}

function sanitizeUploadStem(value: string): string {
  const stem = value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return stem || 'upload';
}

function normalizeUploadExtension(asset: UploadAsset, source: File): string {
  const assetExtension = asset.name.includes('.') ? asset.name.split('.').pop() || '' : '';
  const sourceExtension = source.extension.startsWith('.') ? source.extension.slice(1) : source.extension;
  const mimeExtension = (() => {
    switch ((asset.mimeType || '').toLowerCase()) {
      case 'image/jpeg':
      case 'image/jpg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'video/mp4':
        return 'mp4';
      case 'video/quicktime':
        return 'mov';
      case 'video/x-m4v':
        return 'm4v';
      case 'video/webm':
        return 'webm';
      case 'text/csv':
      case 'application/csv':
      case 'application/vnd.ms-excel':
        return 'csv';
      default:
        return '';
    }
  })();

  return (assetExtension || sourceExtension || mimeExtension).toLowerCase();
}

function buildUploadFile(asset: UploadAsset, field: string): File {
  const source = new File(asset.uri);
  if (!source.exists) {
    throw new Error('The selected file is no longer available. Please choose it again.');
  }

  const extension = normalizeUploadExtension(asset, source);
  const assetBaseName = asset.name.includes('.')
    ? asset.name.slice(0, asset.name.lastIndexOf('.'))
    : asset.name;
  const targetStem = sanitizeUploadStem(assetBaseName || field);
  const targetName = `${Date.now()}-${targetStem}${extension ? `.${extension}` : ''}`;

  const uploadCache = new Directory(Paths.cache, 'campusnotice-uploads');
  uploadCache.create({ idempotent: true, intermediates: true });

  const normalizedFile = new File(uploadCache, targetName);
  if (normalizedFile.exists) {
    normalizedFile.delete();
  }

  source.copy(normalizedFile);
  return normalizedFile;
}

async function postMultipartRequest<T>(
  path: string,
  payload: Record<string, unknown>,
  files?: Record<string, UploadAsset | null | undefined>
): Promise<T> {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    appendFormValue(formData, key, value);
  });

  Object.entries(files || {}).forEach(([field, asset]) => {
    appendUploadAsset(formData, field, asset);
  });

  const response = await expoFetch(apiUrl(path), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
  });

  const rawText = await response.text();
  let parsed: T & { error?: string; success?: boolean };

  try {
    parsed = rawText
      ? (JSON.parse(rawText) as T & { error?: string; success?: boolean })
      : ({} as T & { error?: string; success?: boolean });
  } catch {
    throw new Error(rawText || 'The server returned an unexpected response.');
  }

  if (!response.ok) {
    if (parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string') {
      throw new Error(parsed.error);
    }
    throw new Error(rawText || 'The upload request failed.');
  }

  return parsed as T;
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function webUrl(path: string): string {
  return `${WEB_BASE_URL}${path}`;
}

export function noticeAttachmentUrl(attachment?: string | null): string | null {
  if (!attachment) {
    return null;
  }

  return `${API_BASE_URL}/assets/uploads/${attachment}`;
}

export function shortVideoUrl(videoFilename?: string | null): string | null {
  if (!videoFilename) {
    return null;
  }

  if (/^https?:\/\//i.test(videoFilename)) {
    return videoFilename;
  }

  return `${API_BASE_URL}/assets/uploads/shorts/${videoFilename}`;
}

export function profilePictureUrl(profilePicture?: string | null): string | null {
  if (!profilePicture) {
    return `${API_BASE_URL}/assets/uploads/profiles/default-avatar.png`;
  }

  if (/^https?:\/\//i.test(profilePicture)) {
    return profilePicture;
  }

  return `${API_BASE_URL}/assets/uploads/profiles/${profilePicture}`;
}

export async function warmUpServer(): Promise<void> {
  await apiClient.get(API_PATHS.warmup, {
    responseType: 'text',
    timeout: 15000,
  });
}

export async function saveSession(user: StoredUser): Promise<void> {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<StoredUser | null> {
  const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as StoredUser;
  } catch {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function loginWithPassword(email: string, password: string): Promise<StoredUser> {
  const response = await postRequest<StoredUser & { success: boolean; error?: string }>(API_PATHS.login, {
    email,
    password,
  });

  if (!response.success) {
    throw new Error(response.error || 'Login failed');
  }

  return response;
}

export async function fetchRegistrationOptions(): Promise<RegistrationOptionsResponse> {
  const response = await getRequest<RegistrationOptionsResponse>(API_PATHS.register);

  if (
    !response.success ||
    !Array.isArray(response.faculties) ||
    !Array.isArray(response.departments) ||
    !Array.isArray(response.years)
  ) {
    throw new Error('Registration options are temporarily unavailable.');
  }

  return response;
}

export async function registerStudent(payload: {
  confirm_password: string;
  department_id?: number | null;
  department_name?: string | null;
  email: string;
  faculty_id?: number | null;
  membership?: string | null;
  name: string;
  password: string;
  phone_number?: string | null;
  student_id: string;
  year: number;
}): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.register, payload);
}

export async function requestPasswordReset(email: string): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.passwordReset, {
    action: 'request_reset',
    email,
  });
}

export async function submitPasswordReset(payload: {
  confirm_password: string;
  password: string;
  token: string;
}): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.passwordReset, {
    action: 'reset_password',
    ...payload,
  });
}

export async function fetchFeedback(user: StoredUser): Promise<FeedbackResponse> {
  return getRequest<FeedbackResponse>(API_PATHS.feedback, authParams(user));
}

export async function submitFeedback(
  user: StoredUser,
  payload: {
    category: string;
    message: string;
    subject: string;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.feedback, {
    ...authParams(user),
    action: 'submit',
    ...payload,
  });
}

export async function respondToFeedback(
  user: StoredUser,
  payload: {
    admin_response: string;
    feedback_id: number;
    status?: string;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.feedback, {
    ...authParams(user),
    action: 'respond',
    ...payload,
  });
}

export async function updateFeedbackStatus(
  user: StoredUser,
  feedbackId: number,
  status: string
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.feedback, {
    ...authParams(user),
    action: 'set_status',
    feedback_id: feedbackId,
    status,
  });
}

export async function fetchBootstrap(user: StoredUser): Promise<BootstrapResponse> {
  return getRequest<BootstrapResponse>(API_PATHS.bootstrap, authParams(user));
}

export async function fetchNotices(user: StoredUser): Promise<NoticeItem[]> {
  const response = await getRequest<NoticesResponse>(API_PATHS.notices, authParams(user));
  return response.notices;
}

export async function fetchNoticeDetail(user: StoredUser, noticeId: number): Promise<NoticeDetailResponse> {
  const response = await getRequest<NoticeDetailResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    notice_id: noticeId,
  });

  return response;
}

export async function toggleNoticeBookmark(user: StoredUser, noticeId: number): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'bookmark',
    notice_id: noticeId,
  });
}

export async function acknowledgeNotice(user: StoredUser, noticeId: number): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'acknowledge',
    notice_id: noticeId,
  });
}

export async function addNoticeComment(
  user: StoredUser,
  noticeId: number,
  comment: string
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'add_comment',
    comment,
    notice_id: noticeId,
  });
}

export async function answerNoticeComment(
  user: StoredUser,
  noticeId: number,
  commentId: number,
  answer: string
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'answer_comment',
    answer,
    comment_id: commentId,
    notice_id: noticeId,
  });
}

export async function updateNoticeCommentStatus(
  user: StoredUser,
  noticeId: number,
  commentId: number,
  action: 'hide_comment' | 'reopen_comment'
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action,
    comment_id: commentId,
    notice_id: noticeId,
  });
}

export async function deleteNoticeComment(
  user: StoredUser,
  noticeId: number,
  commentId: number
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'delete_comment',
    comment_id: commentId,
    notice_id: noticeId,
  });
}

export async function markNoticeViewed(user: StoredUser, noticeId: number): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'view',
    notice_id: noticeId,
  });
}

export async function fetchNotifications(user: StoredUser): Promise<NotificationsResponse> {
  return getRequest<NotificationsResponse>(API_PATHS.notifications, authParams(user));
}

export async function runNotificationAction(
  user: StoredUser,
  action: 'mark_all_read' | 'mark_read' | 'delete_all',
  notificationId?: number
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.notifications, {
    ...authParams(user),
    action,
    notification_id: notificationId,
  });
}

export async function fetchBookmarks(user: StoredUser): Promise<NoticeItem[]> {
  const response = await getRequest<{ bookmarks: NoticeItem[]; success: boolean }>(
    API_PATHS.bookmarks,
    authParams(user)
  );
  return response.bookmarks;
}

export async function fetchArchiveNotices(user: StoredUser): Promise<NoticeItem[]> {
  const response = await getRequest<NoticesResponse>(API_PATHS.archive, authParams(user));
  return response.notices;
}

export async function fetchProfile(user: StoredUser): Promise<ProfileResponse> {
  return getRequest<ProfileResponse>(API_PATHS.profile, authParams(user));
}

export async function uploadProfilePhoto(
  user: StoredUser,
  asset: UploadAsset
): Promise<SimpleSuccessResponse> {
  return postMultipartRequest<SimpleSuccessResponse>(
    API_PATHS.profile,
    {
      ...authParams(user),
      action: 'upload_profile_picture',
    },
    {
      profile_picture: asset,
    }
  );
}

export async function updateProfile(
  user: StoredUser,
  payload: {
    department_id?: number | null;
    department_name?: string | null;
    email: string;
    faculty_id?: number | null;
    membership?: string | null;
    name: string;
    phone_number?: string | null;
    year?: number | null;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.profile, {
    ...authParams(user),
    ...payload,
    action: 'update_profile',
  });
}

export async function saveNotificationPreferences(
  user: StoredUser,
  payload: {
    categories: string[];
    email_enabled: boolean;
    emergency_override: boolean;
    in_app_enabled: boolean;
    quiet_hours_end?: string | null;
    quiet_hours_start?: string | null;
    sms_enabled: boolean;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.profile, {
    ...authParams(user),
    ...payload,
    action: 'save_preferences',
  });
}

export async function changePassword(
  user: StoredUser,
  payload: {
    confirm_password: string;
    current_password: string;
    new_password: string;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.profile, {
    ...authParams(user),
    ...payload,
    action: 'change_password',
  });
}

export async function fetchAdminNotices(user: StoredUser): Promise<AdminNoticesResponse> {
  return getRequest<AdminNoticesResponse>(API_PATHS.adminNotices, authParams(user));
}

export async function createAdminNotice(
  user: StoredUser,
  payload: CreateAdminNoticePayload
): Promise<SimpleSuccessResponse> {
  const { attachment, ...fields } = payload;

  return postMultipartRequest<SimpleSuccessResponse>(
    API_PATHS.adminNotices,
    {
      ...authParams(user),
      ...fields,
      action: 'create',
    },
    {
      attachment,
    }
  );
}

export async function runAdminNoticeAction(
  user: StoredUser,
  payload: {
    action: 'archive' | 'approve' | 'delete' | 'publish_now' | 'reject' | 'submit_for_review';
    notice_id: number;
    review_notes?: string;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.adminNotices, {
    ...authParams(user),
    ...payload,
  });
}

export async function fetchLocationHub(user: StoredUser): Promise<LocationHubResponse> {
  return getRequest<LocationHubResponse>(API_PATHS.locations, authParams(user));
}

export async function saveUserLocation(
  user: StoredUser,
  payload: SharedLocation
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.locations, {
    ...authParams(user),
    ...payload,
    action: 'save_location',
  });
}

export async function fetchEmergencyAlerts(user: StoredUser): Promise<EmergencyAlertsResponse> {
  return getRequest<EmergencyAlertsResponse>(API_PATHS.emergencyAlerts, authParams(user));
}

export async function createEmergencyAlert(
  user: StoredUser,
  payload: {
    expires_at?: string | null;
    message: string;
    severity: string;
    target_faculty?: number | null;
    target_year?: number | null;
    title: string;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.emergencyAlerts, {
    ...authParams(user),
    ...payload,
    action: 'create',
  });
}

export async function fetchManageUsers(user: StoredUser): Promise<ManageUsersResponse> {
  return getRequest<ManageUsersResponse>(API_PATHS.manageUsers, authParams(user));
}

export async function createManagedUser(
  user: StoredUser,
  payload: {
    admin_type?: string | null;
    can_post_shorts?: boolean;
    department_id?: number | null;
    department_name?: string | null;
    email: string;
    faculty_id?: number | null;
    membership?: string | null;
    name: string;
    password: string;
    phone_number?: string | null;
    role: UserRole;
    student_id: string;
    year?: number | null;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.manageUsers, {
    ...authParams(user),
    ...payload,
    action: 'create',
  });
}

export async function updateManagedUser(
  user: StoredUser,
  payload: {
    admin_type?: string | null;
    can_post_shorts?: boolean;
    department_id?: number | null;
    department_name?: string | null;
    email: string;
    faculty_id?: number | null;
    is_active: boolean;
    membership?: string | null;
    name: string;
    phone_number?: string | null;
    role: UserRole;
    user_id: number;
    year?: number | null;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.manageUsers, {
    ...authParams(user),
    ...payload,
    action: 'update',
  });
}

export async function deleteManagedUser(user: StoredUser, userId: number): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.manageUsers, {
    ...authParams(user),
    action: 'delete',
    user_id: userId,
  });
}

export async function fetchStudentSyncInfo(user: StoredUser): Promise<StudentSyncResponse> {
  return getRequest<StudentSyncResponse>(API_PATHS.studentSync, authParams(user));
}

export async function uploadStudentSyncFile(
  user: StoredUser,
  asset: UploadAsset
): Promise<StudentSyncResponse> {
  return postMultipartRequest<StudentSyncResponse>(
    API_PATHS.studentSync,
    {
      ...authParams(user),
      action: 'upload_csv',
    },
    {
      csv_file: asset,
    }
  );
}

export async function fetchShorts(user: StoredUser): Promise<ShortsResponse> {
  return getRequest<ShortsResponse>(API_PATHS.shorts, authParams(user));
}

export async function createShort(
  user: StoredUser,
  payload: CreateShortPayload
): Promise<SimpleSuccessResponse> {
  const { video, ...fields } = payload;

  return postMultipartRequest<SimpleSuccessResponse>(
    API_PATHS.shorts,
    {
      ...authParams(user),
      ...fields,
      action: 'create',
    },
    {
      video,
    }
  );
}

export async function runShortAction(
  user: StoredUser,
  payload: {
    action: 'approve' | 'delete' | 'reject' | 'view';
    review_notes?: string;
    short_id: number;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.shorts, {
    ...authParams(user),
    ...payload,
  });
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (
      responseData &&
      typeof responseData === 'object' &&
      'error' in responseData &&
      typeof responseData.error === 'string'
    ) {
      return responseData.error;
    }

    if (typeof responseData === 'string' && responseData.trim() !== '') {
      return responseData;
    }

    if (error.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again in a few seconds.';
    }

    if (error.message === 'Network Error') {
      return 'Could not reach the server. If Render was asleep, wait a few seconds and try again.';
    }

    if (typeof error.message === 'string' && error.message.trim() !== '') {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim() !== '') {
    if (/network request failed/i.test(error.message)) {
      return 'The upload could not reach the server. Re-select the file, confirm your connection, and try a smaller MP4 if the video is very large.';
    }

    return error.message;
  }

  return fallback;
}
