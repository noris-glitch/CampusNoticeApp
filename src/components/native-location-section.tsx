import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import {
  fetchLocationHub,
  getApiErrorMessage,
  LocationEventItem,
  LocationHubResponse,
  noticeAttachmentUrl,
  saveUserLocation,
  StoredUser,
} from '@/config/api';

const palette = {
  accent: '#0f7b6c',
  accentSoft: '#dff8f2',
  bg: '#f4f7fb',
  card: '#ffffff',
  ink: '#10253c',
  line: '#d9e3ef',
  muted: '#60738a',
  navy: '#17324d',
  warm: '#ff8a5b',
};

interface Props {
  isActive: boolean;
  mode?: 'hub' | 'map' | 'nearby' | 'share';
  onDirty: () => void;
  refreshToken: number;
  session: StoredUser;
}

export default function LocationEventsSection({
  isActive,
  mode = 'hub',
  onDirty,
  refreshToken,
  session,
}: Props) {
  const [hub, setHub] = useState<LocationHubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchLocationHub(session);
        if (isMounted) {
          setHub(response);
          setCustomLabel(response.user_location?.location_name || '');
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load the location tools.'));
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

  const hubEvents = normalizeEvents(hub?.events);
  const nearbyEvents = normalizeEvents(hub?.nearby_events);
  const featuredEvents = nearbyEvents.length ? nearbyEvents : hubEvents;
  const visibleFeaturedEvents = featuredEvents.slice(0, 12);
  const userLocation = hub?.user_location ?? null;
  const validMapEvents = hubEvents.filter(hasValidCoordinates);
  const userLocationCoordinates =
    userLocation && isValidCoordinate(userLocation.latitude) && isValidCoordinate(userLocation.longitude)
      ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }
      : null;
  const mapRegion = getInitialRegion(userLocation, hubEvents);
  const intro = getLocationIntro(mode);
  const showShareTools = mode === 'hub' || mode === 'share' || mode === 'nearby';
  const showMap = mode === 'hub' || mode === 'map';
  const showEvents = mode === 'hub' || mode === 'nearby';

  const handleShareCurrentLocation = async () => {
    setSaving(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location', 'Location permission is required to share your place on campus.');
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
      const fallbackLabel = customLabel.trim() || firstAddress?.name || 'Campus location';
      const fallbackAddress = [
        firstAddress?.street,
        firstAddress?.district,
        firstAddress?.city,
      ]
        .filter(Boolean)
        .join(', ');

      await saveUserLocation(session, {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        location_address: fallbackAddress || null,
        location_name: fallbackLabel,
      });

      const refreshed = await fetchLocationHub(session);
      setHub(refreshed);
      setCustomLabel(refreshed.user_location?.location_name || fallbackLabel);
      onDirty();
      Alert.alert('Location', 'Your campus location has been saved.');
    } catch (shareError) {
      Alert.alert('Location', getApiErrorMessage(shareError, 'Could not save your location.'));
    } finally {
      setSaving(false);
    }
  };

  const openAttachment = async (event: LocationEventItem) => {
    const url = noticeAttachmentUrl(event.attachment);
    if (!url) {
      return;
    }

    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View>
        <Text style={styles.headline}>{intro.title}</Text>
        <Text style={styles.subtitle}>{intro.subtitle}</Text>
      </View>

      {showShareTools ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>My campus location</Text>
          <Text style={styles.helper}>
            Nearby event alerts work better when your current location is saved.
          </Text>
          <TextInput
            placeholder="Optional label, for example Library block"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={customLabel}
            onChangeText={setCustomLabel}
          />
          {hub?.user_location ? (
            <View style={styles.locationCard}>
              <Text style={styles.locationTitle}>{hub.user_location.location_name || 'Shared location'}</Text>
              <Text style={styles.locationBody}>
                {formatLocationLabel(hub.user_location)}
              </Text>
            </View>
          ) : null}
          <Pressable disabled={saving} style={styles.primaryButton} onPress={() => void handleShareCurrentLocation()}>
            <Text style={styles.primaryButtonText}>{saving ? 'Saving location...' : 'Use my current location'}</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.stateText}>Loading maps and nearby events...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.stateCard, styles.errorCard]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && hub && !hub.supported ? (
        <View style={styles.stateCard}>
          <Text style={styles.emptyTitle}>Location features are not ready on the server yet</Text>
          <Text style={styles.stateText}>
            The app is connected, but this deployment still needs the location tables or columns enabled.
          </Text>
        </View>
      ) : null}

      {!loading && !error && hub?.supported ? (
        <>
          {showMap ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Campus event map</Text>
              {hubEvents.length > 0 ? (
                <View style={styles.mapFrame}>
                  <MapView
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    initialRegion={mapRegion}
                    loadingEnabled
                    liteMode={Platform.OS === 'android'}
                    rotateEnabled={false}
                    scrollEnabled
                    showsCompass
                    style={styles.mapView}
                    toolbarEnabled={false}
                  >
                    {userLocationCoordinates ? (
                      <Marker
                        coordinate={userLocationCoordinates}
                        pinColor={palette.navy}
                        title={userLocation?.location_name || 'Your location'}
                        description={userLocation?.location_address || 'Saved campus location'}
                      />
                    ) : null}

                    {validMapEvents.map((event) => (
                        <Marker
                          key={event.id}
                          coordinate={{
                            latitude: event.latitude,
                            longitude: event.longitude,
                          }}
                          pinColor={palette.accent}
                          title={event.title}
                          description={event.location_name || 'Campus location'}
                        />
                      ))}
                  </MapView>
                </View>
              ) : (
                <View style={styles.stateCard}>
                  <Text style={styles.emptyTitle}>No mapped events yet</Text>
                  <Text style={styles.stateText}>
                    Once location-enabled notices are published, they will appear here automatically.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {showEvents ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>
                {nearbyEvents.length > 0 ? 'Nearby events' : 'Location-enabled notices'}
              </Text>
              <Text style={styles.helper}>
                {nearbyEvents.length > 0
                  ? 'Events inside the saved-radius view for your campus location.'
                  : 'These notices have map coordinates and can be explored on the campus map.'}
              </Text>

              {featuredEvents.length === 0 ? (
                <View style={styles.stateCard}>
                  <Text style={styles.emptyTitle}>Nothing to show yet</Text>
                  <Text style={styles.stateText}>
                    Save your location first, or wait for a mapped event to be posted.
                  </Text>
                </View>
              ) : (
                visibleFeaturedEvents.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.tagRow}>
                      <Text style={styles.tag}>{event.category || 'Event'}</Text>
                      {formatDistanceLabel(event.distance) ? (
                        <Text style={[styles.tag, styles.distanceTag]}>{formatDistanceLabel(event.distance)}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventMeta}>
                      {event.location_name || 'Campus location'} · {formatDateLabel(event.event_date || event.publish_at || event.created_at)}
                    </Text>
                    <Text numberOfLines={4} style={styles.eventBody}>
                      {event.content}
                    </Text>
                    {event.attachment ? (
                      <Pressable style={styles.secondaryButton} onPress={() => void openAttachment(event)}>
                        <Text style={styles.secondaryButtonText}>Open attachment</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))
              )}
              {featuredEvents.length > visibleFeaturedEvents.length ? (
                <Text style={styles.helper}>
                  Showing the first {visibleFeaturedEvents.length} items. Open the campus map to narrow results.
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function getLocationIntro(mode: NonNullable<Props['mode']>) {
  switch (mode) {
    case 'share':
      return {
        title: 'Share location',
        subtitle: 'Save your current campus location so nearby event alerts can target you better.',
      };
    case 'nearby':
      return {
        title: 'Nearby events',
        subtitle: 'See location-enabled notices happening close to your saved campus position.',
      };
    case 'map':
      return {
        title: 'Event map',
        subtitle: 'Browse all location-enabled campus notices on the live event map.',
      };
    default:
      return {
        title: 'Location & events',
        subtitle: 'Share your location, see nearby activities, and browse the campus event map in one place.',
      };
  }
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return 'Date to be announced';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatLocationLabel(userLocation: LocationHubResponse['user_location']) {
  if (!userLocation) {
    return 'Campus location';
  }

  if (userLocation.location_address) {
    return userLocation.location_address;
  }

  const latitude = isValidCoordinate(userLocation.latitude) ? userLocation.latitude.toFixed(5) : null;
  const longitude = isValidCoordinate(userLocation.longitude) ? userLocation.longitude.toFixed(5) : null;

  if (latitude && longitude) {
    return `${latitude}, ${longitude}`;
  }

  return userLocation.location_name || 'Campus location';
}

function formatDistanceLabel(distance?: number | null) {
  return Number.isFinite(distance as number) ? `${(distance as number).toFixed(1)} km away` : null;
}

function getInitialRegion(
  userLocation: LocationHubResponse['user_location'],
  events: LocationEventItem[]
) {
  const firstEvent = events.find((event) => isValidCoordinate(event.latitude) && isValidCoordinate(event.longitude));

  const latitude = userLocation && isValidCoordinate(userLocation.latitude)
    ? userLocation.latitude
    : firstEvent?.latitude ?? -1.286389;
  const longitude = userLocation && isValidCoordinate(userLocation.longitude)
    ? userLocation.longitude
    : firstEvent?.longitude ?? 36.817223;

  return {
    latitude,
    latitudeDelta: 0.08,
    longitude,
    longitudeDelta: 0.08,
  };
}

function isValidCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasValidCoordinates(
  event: LocationEventItem
): event is LocationEventItem & { latitude: number; longitude: number } {
  return isValidCoordinate(event.latitude) && isValidCoordinate(event.longitude);
}

function normalizeEvents(value: unknown): LocationEventItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is LocationEventItem => typeof item === 'object' && item !== null);
}

const styles = StyleSheet.create({
  distanceTag: {
    backgroundColor: palette.accentSoft,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorCard: {
    backgroundColor: '#ffe3e7',
  },
  errorText: {
    color: '#d9485f',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  eventBody: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  eventCard: {
    backgroundColor: '#eef4fb',
    borderRadius: 18,
    marginTop: 12,
    padding: 16,
  },
  eventMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  eventTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },
  headline: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: '900',
  },
  helper: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  input: {
    backgroundColor: palette.bg,
    borderColor: palette.line,
    borderRadius: 16,
    borderWidth: 1,
    color: palette.ink,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationBody: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: palette.accentSoft,
    borderRadius: 16,
    marginTop: 12,
    padding: 14,
  },
  locationTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  mapFrame: {
    borderColor: palette.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 280,
    marginTop: 12,
    overflow: 'hidden',
  },
  mapView: {
    backgroundColor: palette.bg,
    flex: 1,
  },
  panel: {
    backgroundColor: palette.card,
    borderRadius: 24,
    padding: 18,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.navy,
    borderRadius: 16,
    marginTop: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  screen: {
    backgroundColor: palette.bg,
    gap: 14,
    paddingBottom: 48,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: palette.navy,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 24,
  },
  stateText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  tag: {
    backgroundColor: '#edf3f9',
    borderRadius: 999,
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
