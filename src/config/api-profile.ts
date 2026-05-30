import { API_PATHS, getRequest, postMultipartRequest, postRequest } from './api-core';
import type { ProfileResponse, SimpleSuccessResponse, StoredUser, UploadAsset } from './api-types';

function authParams(user: StoredUser) {
  return {
    token: user.token,
    user_id: user.user_id,
  };
}

export async function fetchProfile(user: StoredUser): Promise<ProfileResponse> {
  return getRequest<ProfileResponse>(API_PATHS.profile, authParams(user));
}

export async function uploadProfilePhoto(user: StoredUser, asset: UploadAsset): Promise<SimpleSuccessResponse> {
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
