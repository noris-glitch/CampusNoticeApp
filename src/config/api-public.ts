import { API_PATHS, getRequest } from './api-core';
import type { PublicSettingsResponse } from './api-types';

export async function fetchPublicSettings(): Promise<PublicSettingsResponse> {
  return getRequest<PublicSettingsResponse>(API_PATHS.publicSettings);
}
