import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { API_PATHS, apiUrl } from '../config/api-core';
import { getApiErrorMessage } from '../config/api-analytics';

export default function HomeScreen({ navigation }) {
  const [notices, setNotices] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchNotices = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        navigation.replace('Login');
        return;
      }

      const currentUser = JSON.parse(userData);
      setUser(currentUser);

      const response = await axios.get(apiUrl(API_PATHS.notices), {
        params: { token: currentUser.token, user_id: currentUser.user_id },
        timeout: 20000,
      });
      if (response.data.success) {
        setNotices(response.data.notices);
      } else {
        Alert.alert('Error', response.data.error || 'Could not fetch notices');
      }
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Could not fetch notices'));
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    void fetchNotices();
  }, [fetchNotices]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    navigation.replace('Login');
  };

  const renderNotice = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardBody} numberOfLines={2}>{item.content}</Text>
      <Text style={styles.cardDate}>{item.created_at}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📢 Notices</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>
      {user && <Text style={styles.welcome}>Welcome, {user.name}!</Text>}
      {loading ? <ActivityIndicator size="large" color="#6c63ff" style={{marginTop: 40}} /> :
        <FlatList data={notices} keyExtractor={(item) => item.id.toString()} renderItem={renderNotice}
          ListEmptyComponent={<Text style={styles.empty}>No notices available</Text>} />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#6c63ff', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logout: { color: '#fff', fontSize: 14 },
  welcome: { padding: 16, fontSize: 16, color: '#333' },
  card: { backgroundColor: '#fff', margin: 8, padding: 16, borderRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  cardBody: { fontSize: 14, color: '#666', marginBottom: 8 },
  cardDate: { fontSize: 12, color: '#999' },
  empty: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 },
});
