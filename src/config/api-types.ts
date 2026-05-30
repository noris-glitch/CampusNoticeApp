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

export interface LandingPageSettings {
  background_color: string;
  background_image?: string | null;
  background_image_url?: string | null;
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
  can_comment?: boolean;
  can_moderate_comments?: boolean;
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
  analytics?: {
    range: 'daily' | 'monthly' | 'weekly';
    series: {
      active_users: { labels: string[]; points: number[] };
      logins: { labels: string[]; points: number[] };
      notice_comments: { labels: string[]; points: number[] };
      notice_downloads: { labels: string[]; points: number[] };
      notices_posted: { labels: string[]; points: number[] };
      notices_viewed: { labels: string[]; points: number[] };
      notifications_read: { labels: string[]; points: number[] };
    };
  };
  open_questions: number;
  pending_approvals: number;
  notice_audit_trail?: {
    action: string;
    after_status?: string | null;
    actor_name: string;
    actor_role?: UserRole | null;
    before_status?: string | null;
    created_at: string;
    details?: string | null;
    id: number;
    notice_id: number;
    notice_title: string;
  }[];
  recent_notices: NoticeItem[];
  recent_students?: {
    created_at: string;
    email: string;
    id: number;
    name: string;
    year?: number | null;
  }[];
  total_bookmarks: number;
  total_notices: number;
  total_students: number;
  total_views: number;
  reports?: {
    department_activity: {
      engagements: number;
      id: number;
      name: string;
      notice_comments: number;
      notice_views: number;
      notices_posted: number;
    }[];
    most_viewed_notices: { id: number; title: string; views: number }[];
    total_notices_posted: number;
    updated_at: string;
    user_engagement: {
      bookmarks: number;
      comments: number;
      email: string;
      id: number;
      interactions: number;
      name: string;
      views: number;
    }[];
    views_per_notice: { id: number; title: string; views: number }[];
  };
}

export interface BootstrapResponse {
  categories: string[];
  dashboard: AdminDashboardData | StudentDashboardData;
  departments?: DepartmentOption[];
  faculties: FacultyOption[];
  landing_page?: LandingPageSettings;
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
  years: { label: string; value: number }[];
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
  can_create?: boolean;
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
  landing_page: LandingPageSettings;
  stats: {
    active_users: number;
    authorized_short_creators?: number;
    students_missing_departments?: number;
    students_missing_phone_numbers?: number;
    total_admins: number;
    total_departments?: number;
    total_faculties?: number;
    total_students: number;
    total_super_admins: number;
    total_users: number;
  };
  success: boolean;
  users: ManagedUserItem[];
  years: YearOption[];
}

export interface PublicSettingsResponse {
  landing_page: LandingPageSettings;
  success: boolean;
}

export interface LandingPageCache {
  background_color?: string | null;
  background_image?: string | null;
  background_image_url?: string | null;
}

export interface StudentSyncResponse {
  backfill_summary?: {
    missing_both: number;
    missing_departments: number;
    missing_phone_numbers: number;
    ready_profiles: number;
    samples: {
      email: string;
      faculty_name?: string | null;
      id: number;
      name: string;
      phone_number?: string | null;
      student_id?: string | null;
    }[];
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
