import React, { startTransition, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedbackInboxSection, StudentFeedbackSection } from '@/components/native-feedback-sections';
import {
  CustomizationSection,
  EmergencyAlertsSection,
  HelpSupportSection,
  ManageUsersSection,
  StudentSyncSection,
} from '@/components/native-admin-tools';
import LocationEventsSection from '@/components/native-location-section';
import { AdminDashboardSection, CreateNoticeSection, ManageNoticesSection } from '@/components/native-admin-sections';
import {
  ArchiveSection,
  BookmarksSection,
  NotificationsSection,
  ProfileSection,
  StudentFeedSection,
} from '@/components/native-sections-common';
import ShortsSection from '@/components/native-shorts-section';
import {
  AdminDashboardData,
  BootstrapResponse,
  fetchBootstrap,
  getApiErrorMessage,
  saveSession,
  StoredUser,
  StudentDashboardData,
} from '@/config/api';

type ScreenKey =
  | 'archive'
  | 'bookmarks'
  | 'create'
  | 'createLocation'
  | 'customization'
  | 'dashboard'
  | 'emergency'
  | 'eventMap'
  | 'feedback'
  | 'feedbackInbox'
  | 'feed'
  | 'help'
  | 'manage'
  | 'manageUsers'
  | 'nearby'
  | 'notifications'
  | 'profile'
  | 'shareLocation'
  | 'shorts'
  | 'studentSync';

type MenuSection = {
  heading: string;
  items: Array<{ badge?: number; icon: string; key: ScreenKey; label: string }>;
};

const palette = {
  bg: '#f4f7fb',
  ink: '#10253c',
  line: '#d9e3ef',
  muted: '#60738a',
  navy: '#17324d',
  sea: '#0f7b6c',
  shell: '#ffffff',
};

export default function NativeAppShell({
  onLogout,
  onSessionUpdated,
  session,
}: {
  onLogout: () => Promise<void>;
  onSessionUpdated: (user: StoredUser) => Promise<void> | void;
  session: StoredUser;
}) {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>(getDefaultScreen(session.role));
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    startTransition(() => {
      setActiveScreen(getDefaultScreen(session.role));
      setMenuOpen(false);
    });
  }, [session.role]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchBootstrap(session);
        if (isMounted) {
          setBootstrap(response);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, 'Could not load the app dashboard.'));
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
  }, [refreshToken, session]);

  const handleDirty = () => {
    setRefreshToken((current) => current + 1);
  };

  const handleSessionRefresh = async (user: StoredUser) => {
    await saveSession(user);
    await onSessionUpdated(user);
    handleDirty();
  };

  const menuSections = getMenuSections(session.role, session.admin_type || null, bootstrap?.unread_notifications || 0);
  const currentMenuItem =
    menuSections.flatMap((section) => section.items).find((item) => item.key === activeScreen) ||
    menuSections[0]?.items[0];
  const studentDashboard =
    session.role === 'student' ? (bootstrap?.dashboard as StudentDashboardData | undefined) : undefined;
  const adminDashboard =
    session.role !== 'student' ? (bootstrap?.dashboard as AdminDashboardData | undefined) : undefined;

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Pressable onPress={() => setMenuOpen(true)} style={styles.menuButton}>
          <Text style={styles.menuButtonText}>☰</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.kicker}>
            {session.role_label || 'JOOUST Notice'}
          </Text>
          <Text numberOfLines={1} style={styles.title}>
            {currentMenuItem?.label || session.name}
          </Text>
          <Text numberOfLines={2} style={styles.subtitle}>
            {session.faculty_name || 'Campus-wide access'}
            {session.year ? ` · Year ${session.year}` : ''}
          </Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={() => void onLogout()}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={palette.sea} size="large" />
          <Text style={styles.stateText}>Loading your workspace...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Couldn&apos;t load the app</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.body}>
          {activeScreen === 'feed' ? (
            <StudentFeedSection
              categories={bootstrap?.categories || []}
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
              summary={studentDashboard || null}
            />
          ) : null}
          {activeScreen === 'notifications' ? (
            <NotificationsSection
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'bookmarks' ? (
            <BookmarksSection
              categories={bootstrap?.categories || []}
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'archive' ? (
            <ArchiveSection
              categories={bootstrap?.categories || []}
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'shorts' ? (
            <ShortsSection
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'feedback' ? (
            <StudentFeedbackSection
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'shareLocation' ? (
            <LocationEventsSection
              isActive
              mode="share"
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'nearby' ? (
            <LocationEventsSection
              isActive
              mode="nearby"
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'eventMap' ? (
            <LocationEventsSection
              isActive
              mode="map"
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'profile' ? (
            <ProfileSection
              categories={bootstrap?.categories || []}
              faculties={bootstrap?.faculties || []}
              isActive
              onDirty={handleDirty}
              onSessionUpdated={handleSessionRefresh}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'dashboard' ? <AdminDashboardSection dashboard={adminDashboard || null} /> : null}
          {activeScreen === 'manage' ? (
            <ManageNoticesSection
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'create' ? (
            <CreateNoticeSection
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'createLocation' ? (
            <CreateNoticeSection
              isActive
              mode="location"
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'emergency' ? (
            <EmergencyAlertsSection
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'manageUsers' ? (
            <ManageUsersSection
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'customization' ? (
            <CustomizationSection
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'studentSync' ? (
            <StudentSyncSection
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'feedbackInbox' ? (
            <FeedbackInboxSection
              isActive
              onDirty={handleDirty}
              refreshToken={refreshToken}
              session={session}
            />
          ) : null}
          {activeScreen === 'help' ? <HelpSupportSection /> : null}
        </View>
      ) : null}

      <Modal animationType="fade" onRequestClose={() => setMenuOpen(false)} transparent visible={menuOpen}>
        <View style={styles.drawerBackdrop}>
          <Pressable style={styles.drawerMask} onPress={() => setMenuOpen(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>JOOUSTNotice</Text>
              <Text style={styles.drawerSubtitle}>{session.name}</Text>
            </View>

            {menuSections.map((section) => (
              <View key={section.heading} style={styles.drawerSection}>
                <Text style={styles.drawerSectionTitle}>{section.heading}</Text>
                {section.items.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      startTransition(() => {
                        setActiveScreen(item.key);
                        setMenuOpen(false);
                      });
                    }}
                    style={[styles.drawerItem, activeScreen === item.key ? styles.drawerItemActive : null]}
                  >
                    <Text style={[styles.drawerIcon, activeScreen === item.key ? styles.drawerItemTextActive : null]}>
                      {item.icon}
                    </Text>
                    <Text style={[styles.drawerItemText, activeScreen === item.key ? styles.drawerItemTextActive : null]}>
                      {item.label}
                    </Text>
                    {item.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getDefaultScreen(role: StoredUser['role']): ScreenKey {
  return role === 'student' ? 'feed' : 'dashboard';
}

function getMenuSections(
  role: StoredUser['role'],
  adminType: StoredUser['admin_type'] | null,
  unreadNotifications: number
): MenuSection[] {
  if (role === 'student') {
    return [
      {
        heading: 'Main',
        items: [
          { icon: '🏠', key: 'feed', label: 'Home feed' },
          {
            badge: unreadNotifications > 0 ? unreadNotifications : undefined,
            icon: '🔔',
            key: 'notifications',
            label: 'Notifications',
          },
          { icon: '🎬', key: 'shorts', label: 'Shorts' },
          { icon: '🔖', key: 'bookmarks', label: 'Bookmarks' },
          { icon: '🗂️', key: 'archive', label: 'Notice archive' },
        ],
      },
      {
        heading: 'Location & Events',
        items: [
          { icon: '📍', key: 'shareLocation', label: 'Share location' },
          { icon: '🗺️', key: 'nearby', label: 'Nearby events' },
          { icon: '📍', key: 'eventMap', label: 'Event map' },
        ],
      },
      {
        heading: 'Account',
        items: [{ icon: '👤', key: 'profile', label: 'My profile' }],
      },
      {
        heading: 'General',
        items: [
          { icon: '💬', key: 'feedback', label: 'Feedback' },
          { icon: '❓', key: 'help', label: 'Help & support' },
        ],
      },
    ];
  }

  if (role === 'super_admin') {
    return [
      {
        heading: 'Main',
        items: [
          { icon: '👑', key: 'dashboard', label: 'Dashboard' },
          { icon: '🚨', key: 'emergency', label: 'Emergency alert' },
          { icon: '🎬', key: 'shorts', label: 'Shorts' },
        ],
      },
      {
        heading: 'User Management',
        items: [
          { icon: '👥', key: 'manageUsers', label: 'Manage all users' },
          { icon: '🔄', key: 'studentSync', label: 'Student sync' },
        ],
      },
      {
        heading: 'Customization',
        items: [{ icon: '🎨', key: 'customization', label: 'Customization' }],
      },
      {
        heading: 'Engagement',
        items: [{ icon: '💬', key: 'feedbackInbox', label: 'Feedback inbox' }],
      },
      {
        heading: 'Notice Management',
        items: [
          { icon: '➕', key: 'create', label: 'Create notice' },
          { icon: '📍', key: 'createLocation', label: 'Create location event' },
          { icon: '📋', key: 'manage', label: 'Manage notices' },
          { icon: '🗺️', key: 'eventMap', label: 'Event map' },
        ],
      },
      {
        heading: 'Account',
        items: [{ icon: '👤', key: 'profile', label: 'My profile' }],
      },
    ];
  }

  const sections: MenuSection[] = [
    {
      heading: 'Main',
      items: [
        { icon: '📊', key: 'dashboard', label: 'Dashboard' },
        { icon: '🎬', key: 'shorts', label: 'Shorts' },
      ],
    },
    {
      heading: 'Notice Management',
      items: [
        { icon: '➕', key: 'create', label: 'Create notice' },
        { icon: '📍', key: 'createLocation', label: 'Create location event' },
        { icon: '📋', key: 'manage', label: 'My notices' },
      ],
    },
    {
      heading: 'Location & Events',
      items: [
        { icon: '🗺️', key: 'nearby', label: 'Nearby events' },
        { icon: '📍', key: 'eventMap', label: 'Event map view' },
      ],
    },
    {
      heading: 'Account',
      items: [{ icon: '👤', key: 'profile', label: 'My profile' }],
    },
  ];

  if (role === 'admin' && ['dean_of_students', 'faculty', 'hod'].includes(adminType || '')) {
    sections.splice(2, 0, {
      heading: 'User Management',
      items: [{ icon: '🔄', key: 'studentSync', label: 'Sync students' }],
    });
  }

  return sections;
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: palette.sea,
    borderRadius: 999,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  drawer: {
    backgroundColor: '#10253c',
    height: '100%',
    maxWidth: 360,
    paddingHorizontal: 18,
    paddingTop: 18,
    width: '82%',
  },
  drawerBackdrop: {
    backgroundColor: 'rgba(9, 23, 38, 0.42)',
    flex: 1,
    flexDirection: 'row',
  },
  drawerHeader: {
    borderBottomColor: 'rgba(255,255,255,0.12)',
    borderBottomWidth: 1,
    paddingBottom: 18,
  },
  drawerIcon: {
    fontSize: 18,
  },
  drawerItem: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  drawerItemActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  drawerItemText: {
    color: '#d7e4f2',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  drawerItemTextActive: {
    color: '#ffffff',
  },
  drawerMask: {
    flex: 1,
  },
  drawerSection: {
    marginTop: 18,
  },
  drawerSectionTitle: {
    color: '#8fb3d8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 6,
    textTransform: 'uppercase',
  },
  drawerSubtitle: {
    color: '#c1d4e8',
    fontSize: 13,
    marginTop: 6,
  },
  drawerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  errorText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  errorTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  header: {
    alignItems: 'flex-start',
    backgroundColor: palette.navy,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: '#92daca',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  menuButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  safeArea: {
    backgroundColor: palette.bg,
    flex: 1,
  },
  stateText: {
    color: palette.muted,
    fontSize: 14,
    marginTop: 12,
  },
  subtitle: {
    color: '#c1d4e8',
    fontSize: 13,
    marginTop: 4,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
});
