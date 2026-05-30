import { API_PATHS, getRequest, postRequest } from './api-core';
import type { LocationHubResponse, SharedLocation, SimpleSuccessResponse, StoredUser } from './api-types';

function authParams(user: StoredUser) {
  return {
    token: user.token,
    user_id: user.user_id,
  };
}

export async function fetchLocationHub(user: StoredUser): Promise<LocationHubResponse> {
  return getRequest<LocationHubResponse>(API_PATHS.locations, authParams(user));
}

export async function saveUserLocation(
  user: StoredUser,
  location: SharedLocation
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.locations, {
    ...authParams(user),
    action: 'save_location',
    latitude: location.latitude,
    location_address: location.location_address || '',
    location_name: location.location_name || '',
    longitude: location.longitude,
  });
}
