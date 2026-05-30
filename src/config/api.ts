export {
  API_BASE_URL,
  API_PATHS,
  assetUrl,
  landingBackgroundUrl,
  noticeAttachmentUrl,
  profilePictureUrl,
  postMultipartRequest,
  shortVideoUrl,
  warmUpServer,
  webUrl,
} from './api-core';

export {
  LANDING_PAGE_CACHE_KEY,
  SESSION_PROFILE_STORAGE_KEY,
  SESSION_TOKEN_STORAGE_KEY,
  clearSession,
  loadLandingPageCache,
  loadSession,
  saveLandingPageCache,
  saveSession,
} from './session-storage';

export {
  fetchBootstrap,
  fetchFeedback,
  fetchRegistrationOptions,
  loginWithPassword,
  registerStudent,
  requestPasswordReset,
  respondToFeedback,
  submitFeedback,
  submitPasswordReset,
  updateFeedbackStatus,
} from './api-auth';

export {
  addNoticeComment,
  acknowledgeNotice,
  answerNoticeComment,
  deleteNoticeComment,
  fetchArchiveNotices,
  fetchBookmarks,
  fetchNoticeDetail,
  fetchNotices,
  fetchNotifications,
  markNoticeViewed,
  runNotificationAction,
  toggleNoticeBookmark,
  updateNoticeCommentStatus,
} from './api-notices';

export {
  createDepartment,
  createAdminNotice,
  createEmergencyAlert,
  createFaculty,
  createManagedUser,
  deleteDepartment,
  deleteFaculty,
  deleteManagedUser,
  fetchAdminNotices,
  fetchEmergencyAlerts,
  fetchManageUsers,
  fetchShorts,
  fetchStudentSyncInfo,
  runAdminNoticeAction,
  runShortAction,
  updateLandingPageTheme,
  updateManagedUser,
  uploadLandingPageBackground,
  clearLandingPageBackground,
  uploadStudentSyncFile,
  createShort,
} from './api-admin';

export {
  fetchProfile,
  uploadProfilePhoto,
  updateProfile,
  saveNotificationPreferences,
  changePassword,
} from './api-profile';

export {
  AnalyticsReportRequest,
  analyticsReportUrl,
  downloadAnalyticsReportPdf,
  getApiErrorMessage,
} from './api-analytics';

export { fetchPublicSettings } from './api-public';

export { fetchLocationHub, saveUserLocation } from './api-location';

export type {
  AdminDashboardData,
  AdminNoticesResponse,
  BootstrapResponse,
  CreateAdminNoticePayload,
  CreateShortPayload,
  DepartmentOption,
  EmergencyAlertItem,
  EmergencyAlertsResponse,
  FeedbackItem,
  FeedbackResponse,
  FacultyOption,
  LandingPageCache,
  LandingPageSettings,
  LocationEventItem,
  LocationHubResponse,
  ManagedUserItem,
  ManageUsersResponse,
  NoticeCommentItem,
  NoticeDetailResponse,
  NoticeItem,
  NoticesResponse,
  NotificationItem,
  NotificationsResponse,
  ProfileResponse,
  PublicSettingsResponse,
  RegistrationOptionsResponse,
  SharedLocation,
  ShortItem,
  ShortsResponse,
  SimpleSuccessResponse,
  StoredUser,
  StudentDashboardData,
  StudentSyncResponse,
  TemplateOption,
  UploadAsset,
  UserRole,
  YearOption,
} from './api-types';
