import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { payoutsAPI } from '@/services/api';

export const ApiTest: React.FC = () => {
  const [testing, setTesting] = useState(false);

  const testClientBalance = async () => {
    setTesting(true);
    try {
      // Use a sample client ID - replace with actual client ID from your app
      const sampleClientId = 'your-client-id-here';
      console.log('Testing client balance API...');
      const response = await payoutsAPI.getClientBalance(sampleClientId);
      console.log('API Response:', response);
      Alert.alert('Success', `API Response: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      console.error('API Test Error:', error);
      Alert.alert('Error', `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Test</Text>
      <TouchableOpacity 
        style={styles.button} 
        onPress={testClientBalance}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Client Balance API'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});