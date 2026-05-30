import { create as axiosCreate } from 'axios';
import { fetch as expoFetch } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';

import type { UploadAsset } from './api-types';

export const API_BASE_URL = 'https://campus-notice.onrender.com';
export const WEB_BASE_URL = API_BASE_URL;

export const API_PATHS = {
  warmup: '/login.php',
  publicSettings: '/ajax/api/public_settings.php',
  login: '/ajax/api/login.php',
  register: '/ajax/api/register.php',
  passwordReset: '/ajax/api/password_reset.php',
  feedback: '/ajax/api/feedback.php',
  bootstrap: '/ajax/api/bootstrap.php',
  analyticsReport: '/ajax/api/analytics_report.php',
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

const apiClient = axiosCreate({
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

export async function getRequest<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<T>(path, { params });
  return ensureApiObject<T>(response.data, 'The server returned an unexpected response.');
}

export async function postRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await apiClient.post<T>(path, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return ensureApiObject<T>(response.data, 'The server returned an unexpected response.');
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function webUrl(path: string): string {
  return `${WEB_BASE_URL}${path}`;
}

export function assetUrl(path?: string | null): string | null {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
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

export function landingBackgroundUrl(
  backgroundImageUrl?: string | null,
  backgroundImage?: string | null
): string | null {
  return assetUrl(backgroundImageUrl || backgroundImage);
}

export async function warmUpServer(): Promise<void> {
  await apiClient.get(API_PATHS.warmup, {
    responseType: 'text',
    timeout: 15000,
  });
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
  const assetBaseName = asset.name.includes('.') ? asset.name.slice(0, asset.name.lastIndexOf('.')) : asset.name;
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

function appendUploadAsset(formData: FormData, field: string, asset?: UploadAsset | null): void {
  if (!asset) {
    return;
  }

  formData.append(field, buildUploadFile(asset, field));
}

export async function postMultipartRequest<T>(
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
