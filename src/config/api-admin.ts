import { API_PATHS, getRequest, postMultipartRequest, postRequest } from './api-core';
import type {
  AdminNoticesResponse,
  CreateAdminNoticePayload,
  CreateShortPayload,
  EmergencyAlertsResponse,
  LocationHubResponse,
  ManageUsersResponse,
  SharedLocation,
  ShortsResponse,
  SimpleSuccessResponse,
  StoredUser,
  StudentSyncResponse,
  UserRole,
  UploadAsset,
} from './api-types';

function authParams(user: StoredUser) {
  return {
    token: user.token,
    user_id: user.user_id,
  };
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
    auth_user_id: user.user_id,
    token: user.token,
    ...payload,
    action: 'update',
  });
}

export async function deleteManagedUser(user: StoredUser, userId: number): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.manageUsers, {
    auth_user_id: user.user_id,
    token: user.token,
    action: 'delete',
    user_id: userId,
  });
}

export async function createFaculty(
  user: StoredUser,
  payload: { dean_name?: string | null; name: string }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.manageUsers, {
    ...authParams(user),
    ...payload,
    action: 'create_faculty',
  });
}

export async function deleteFaculty(user: StoredUser, facultyId: number): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.manageUsers, {
    ...authParams(user),
    action: 'delete_faculty',
    faculty_id: facultyId,
  });
}

export async function createDepartment(
  user: StoredUser,
  payload: { code?: string | null; faculty_id: number; name: string }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.manageUsers, {
    ...authParams(user),
    ...payload,
    action: 'create_department',
  });
}

export async function deleteDepartment(
  user: StoredUser,
  departmentId: number
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.manageUsers, {
    ...authParams(user),
    action: 'delete_department',
    department_id: departmentId,
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

export async function updateLandingPageTheme(
  user: StoredUser,
  payload: { background_color?: string | null }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.manageUsers, {
    ...authParams(user),
    ...payload,
    action: 'update_landing_page_theme',
  });
}

export async function uploadLandingPageBackground(
  user: StoredUser,
  asset: UploadAsset
): Promise<SimpleSuccessResponse> {
  return postMultipartRequest<SimpleSuccessResponse>(
    API_PATHS.manageUsers,
    {
      ...authParams(user),
      action: 'upload_landing_background',
    },
    {
      background_image: asset,
    }
  );
}

export async function clearLandingPageBackground(user: StoredUser): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.manageUsers, {
    ...authParams(user),
    action: 'clear_landing_background',
  });
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
