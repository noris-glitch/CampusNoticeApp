import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { API_PATHS, apiUrl, getApiErrorMessage } from '../config/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(apiUrl(API_PATHS.login), { email, password }, { timeout: 20000 });
      if (response.data.success) {
        await AsyncStorage.setItem('user', JSON.stringify(response.data));
        navigation.replace('Home');
      } else {
        Alert.alert('Error', response.data.error || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Could not connect to server'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 JOOUST Notice System</Text>
      <Text style={styles.subtitle}>Jaramogi Oginga Odinga University</Text>
      <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#333' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32, color: '#666' },
  input: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#6c63ff', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
