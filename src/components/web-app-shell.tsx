import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from 'expo-router';

import { WEB_BASE_URL, webUrl } from '@/config/api';

const INITIAL_URL = webUrl('/login.php');

export default function WebAppShell() {
  const webViewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }

        return false;
      });

      return () => subscription.remove();
    }, [canGoBack])
  );

  const handleExternalUrl = (url: string) => {
    void Linking.openURL(url).catch(() => {
      setErrorMessage('Could not open that link on this device.');
    });
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setLoading(true);
    webViewRef.current?.reload();
  };

  const shouldAllowRequest = (url: string) => {
    if (
      url.startsWith('mailto:') ||
      url.startsWith('tel:') ||
      url.startsWith('sms:') ||
      url.startsWith('intent:')
    ) {
      handleExternalUrl(url);
      return false;
    }

    if (url.startsWith('about:blank') || url.startsWith(WEB_BASE_URL)) {
      return true;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      handleExternalUrl(url);
      return false;
    }

    return true;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <WebView
        ref={webViewRef}
        source={{ uri: INITIAL_URL }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        startInLoadingState
        onShouldStartLoadWithRequest={(request) => shouldAllowRequest(request.url)}
        onNavigationStateChange={(state) => {
          setCanGoBack(state.canGoBack);
        }}
        onLoadStart={() => {
          setLoading(true);
          setErrorMessage(null);
        }}
        onLoadEnd={() => {
          setLoading(false);
        }}
        onError={(event) => {
          setLoading(false);
          setErrorMessage(
            event.nativeEvent.description || 'Unable to load the campus notice web app right now.'
          );
        }}
        onHttpError={(event) => {
          setLoading(false);
          setErrorMessage(`The server returned ${event.nativeEvent.statusCode}. Please try again.`);
        }}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingTitle}>Opening JOOUST Campus Notice</Text>
            <Text style={styles.loadingSubtitle}>
              Loading the live web app so every role sees the same experience.
            </Text>
          </View>
        )}
        style={styles.webView}
      />

      {loading && !errorMessage ? (
        <View pointerEvents="none" style={styles.statusBanner}>
          <Text style={styles.statusText}>Connecting to Render...</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorOverlay}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn&apos;t open the app</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10253c',
  },
  webView: {
    flex: 1,
    backgroundColor: '#10253c',
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10253c',
    paddingHorizontal: 24,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#c7d3e6',
    textAlign: 'center',
  },
  statusBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(16, 37, 60, 0.88)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusText: {
    color: '#f4f7fb',
    fontSize: 12,
    fontWeight: '700',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 18, 30, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1d2a3b',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    color: '#5d6c80',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
