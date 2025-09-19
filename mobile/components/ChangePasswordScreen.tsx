import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { API_CONFIG } from '@/constants/api';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChangePasswordScreen: React.FC<{ onPasswordChanged?: () => void }> = ({ onPasswordChanged }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout } = useAuth();

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.AUTH.CHANGE_PASSWORD.replace(':user_id', user?.id || '')}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          current_password: currentPassword,
          new_password: newPassword 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', 'Password changed successfully.');
        if (onPasswordChanged) onPasswordChanged();
      } else {
        Alert.alert('Error', data.detail || 'Failed to change password.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while changing password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.light.primary.red} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>BENSCO</Text>
          <Text style={styles.logoSubtext}>SUSU LIMITED</Text>
        </View>
        <Text style={styles.title}>Change Your Password</Text>
        <Text style={styles.subtitle}>Please update your password to continue</Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        {/* Current Password */}
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.light.text.secondary} />
          <TextInput
            style={styles.input}
            placeholder="Current Password"
            secureTextEntry={!showCurrentPassword}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            editable={!isLoading}
          />
          <TouchableOpacity 
            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            style={styles.eyeIcon}
          >
            <MaterialCommunityIcons 
              name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color={Colors.light.text.secondary} 
            />
          </TouchableOpacity>
        </View>

        {/* New Password */}
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="lock-plus-outline" size={20} color={Colors.light.text.secondary} />
          <TextInput
            style={styles.input}
            placeholder="New Password"
            secureTextEntry={!showNewPassword}
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!isLoading}
          />
          <TouchableOpacity 
            onPress={() => setShowNewPassword(!showNewPassword)}
            style={styles.eyeIcon}
          >
            <MaterialCommunityIcons 
              name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color={Colors.light.text.secondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="lock-check-outline" size={20} color={Colors.light.text.secondary} />
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isLoading}
          />
          <TouchableOpacity 
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <MaterialCommunityIcons 
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color={Colors.light.text.secondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Change Password Button */}
        <TouchableOpacity 
          style={[styles.changeButton, isLoading && styles.changeButtonDisabled]}
          onPress={handleChangePassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.light.text.onPrimary} />
          ) : (
            <Text style={styles.changeButtonText}>Change Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background.primary,
  },
  
  header: {
    backgroundColor: Colors.light.primary.red,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.text.onPrimary,
    letterSpacing: 2,
  },
  
  logoSubtext: {
    fontSize: 14,
    color: Colors.light.text.onPrimary,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.8,
  },
  
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text.onPrimary,
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 16,
    color: Colors.light.text.onPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
  
  formContainer: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border.light,
    shadowColor: Colors.light.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text.primary,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  
  eyeIcon: {
    padding: 8,
  },
  
  changeButton: {
    backgroundColor: Colors.light.primary.red,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: Colors.light.shadow.colored,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  
  changeButtonDisabled: {
    backgroundColor: Colors.light.text.light,
    shadowOpacity: 0,
    elevation: 0,
  },
  
  changeButtonText: {
    color: Colors.light.text.onPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ChangePasswordScreen;