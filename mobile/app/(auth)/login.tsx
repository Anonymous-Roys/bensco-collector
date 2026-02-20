import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockTimer, setBlockTimer] = useState<number>(0);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState({ isOnline: false, quality: 'offline' as const });

  // Use enhanced auth hook
  const { 
    login, 
    offlineLogin, 
    requestPasswordReset, 
    getSavedCredentials, 
    isLoading: authLoading, 
    getNetworkStatus,
    connectionQuality 
  } = useAuth();

  // Combined loading state
  const isLoading = authLoading || isLoggingIn;

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      const status = getNetworkStatus();
      setNetworkStatus(status);
    };

    // Update immediately
    updateNetworkStatus();

    // Set up interval to check network status
    const interval = setInterval(updateNetworkStatus, 2000);

    return () => clearInterval(interval);
  }, [getNetworkStatus]);

  // Load saved credentials on component mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const credentials = await getSavedCredentials();
        if (credentials) {
          setEmail(credentials.email);
          setPassword(credentials.password);
          setRememberMe(true);
          console.log('📱 Loaded saved credentials');
        }
      } catch (error) {
        console.log('⚠️ Could not load saved credentials:', error);
      }
    };

    loadCredentials();
  }, [getSavedCredentials]);

  // Handle block timer
  useEffect(() => {
    if (isBlocked && blockTimer > 0) {
      const timer = setTimeout(() => {
        setBlockTimer(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (blockTimer === 0) {
      setIsBlocked(false);
      setLoginAttempts(0);
    }
  }, [isBlocked, blockTimer]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async (): Promise<void> => {
    if (isLoggingIn) {
      console.log('🔄 Login already in progress...');
      return;
    }

    if (isBlocked) {
      Alert.alert(
        "Account Temporarily Locked",
        `Please wait ${blockTimer} seconds before trying again.`,
        [{ text: "OK" }]
      );
      return;
    }

    // Validation
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter both email and password.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    // Check network for online login
    if (!networkStatus.isOnline) {
      Alert.alert(
        "No Internet Connection",
        "You're offline. Would you like to try logging in with cached credentials?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Try Offline Login", onPress: handleOfflineLogin }
        ]
      );
      return;
    }

    // Warn about weak connection
    if (networkStatus.quality === 'poor') {
      Alert.alert(
        "Weak Connection",
        "Your internet connection is weak. Login may take longer than usual.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: () => performLogin() }
        ]
      );
      return;
    }

    await performLogin();
  };

  const performLogin = async (): Promise<void> => {
    setIsLoggingIn(true);

    try {
      console.log('🔑 Attempting login for:', email);
      
      const result = await login({ email, password }, rememberMe);

      if (result.success) {
        if (result.mustChangePassword || result.isFirstLogin) {
          console.log('🔑 First login detected, redirecting to change password...');
          router.push({
            pathname: "/change-password",
            params: { 
              isRequired: "true",
              email: email 
            }
          });
        } else {
          console.log('🔑 Login successful, navigating to tabs...');
          router.replace('/(tabs)');
        }
        setLoginAttempts(0);
      } else {
        handleLoginFailure(result.error || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
      handleLoginFailure(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginFailure = (errorMessage: string): void => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);

    if (newAttempts >= 5) {
      setIsBlocked(true);
      setBlockTimer(300); // 5 minutes block
      Alert.alert(
        "Account Locked",
        "Too many failed attempts. Your account has been temporarily locked for 5 minutes.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "Login Failed",
        `${errorMessage}\n\n${5 - newAttempts} attempts remaining.`,
        [{ text: "Try Again" }]
      );
    }
  };

  const handleOfflineLogin = async (): Promise<void> => {
    if (isLoggingIn) {
      console.log('🔄 Offline login already in progress...');
      return;
    }

    setIsLoggingIn(true);

    try {
      console.log('📱 Attempting offline login...');
      const result = await offlineLogin();

      if (result.success) {
        console.log('🔑 Offline login successful, navigating to tabs...');
        router.replace('/(tabs)');
      } else {
        Alert.alert(
          "Offline Login Failed",
          result.error || "No cached login data found. Please connect to the internet to log in.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('❌ Offline login error:', error);
      Alert.alert(
        "Offline Login Error",
        "Unable to access cached login data. Please connect to the internet.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getConnectionStatusColor = (): string => {
    if (!networkStatus.isOnline) return Colors.light.status.error;
    
    switch (networkStatus.quality) {
      case 'excellent': return Colors.light.status.success;
      case 'good': return Colors.light.status.success;
      case 'fair': return Colors.light.status.warning;
      case 'poor': return Colors.light.status.error;
      default: return Colors.light.status.error;
    }
  };

  const getConnectionStatusText = (): string => {
    if (!networkStatus.isOnline) return 'Offline';
    
    switch (networkStatus.quality) {
      case 'excellent': return 'Excellent Connection';
      case 'good': return 'Good Connection';
      case 'fair': return 'Fair Connection';
      case 'poor': return 'Poor Connection';
      default: return 'Unknown';
    }
  };

  const getConnectionIcon = (): string => {
    if (!networkStatus.isOnline) return 'wifi-off';
    
    switch (networkStatus.quality) {
      case 'excellent': return 'wifi';
      case 'good': return 'wifi';
      case 'fair': return 'wifi-strength-2';
      case 'poor': return 'wifi-strength-1';
      default: return 'wifi-off';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.light.primary.red} />
      
      {/* Enhanced Connection Status */}
      <View style={[styles.connectionStatus, { backgroundColor: getConnectionStatusColor() }]}>
        <MaterialCommunityIcons 
          name={getConnectionIcon()} 
          size={16} 
          color={Colors.light.text.onPrimary} 
        />
        <Text style={styles.connectionText}>
          {getConnectionStatusText()}
        </Text>
        {networkStatus.quality === 'poor' && networkStatus.isOnline && (
          <MaterialCommunityIcons 
            name="alert-circle-outline" 
            size={14} 
            color={Colors.light.text.onPrimary} 
            style={{ marginLeft: 4 }}
          />
        )}
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>BENSCO</Text>
            <Text style={styles.logoSubtext}>SUSU LIMITED</Text>
          </View>
          <Text style={styles.welcomeText}>Field Worker Login</Text>
          
          {/* Network Quality Indicator */}
          {networkStatus.isOnline && networkStatus.quality === 'poor' && (
            <View style={styles.networkWarning}>
              <MaterialCommunityIcons name="wifi-strength-1" size={16} color={Colors.light.status.warning} />
              <Text style={styles.networkWarningText}>Slow connection detected</Text>
            </View>
          )}
        </View>
        
        {/* Login Form */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="account-outline" size={20} color={Colors.light.text.secondary} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.light.text.secondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading && !isBlocked}
            />
          </View>
          
          {/* Password Input */}
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.light.text.secondary} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.light.text.secondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading && !isBlocked}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              disabled={isLoading}
            >
              {showPassword ? (
                <MaterialCommunityIcons name="eye-off-outline" size={20} color={Colors.light.text.secondary} />
              ) : (
                <MaterialCommunityIcons name="eye-outline" size={20} color={Colors.light.text.secondary} />
              )}
            </TouchableOpacity>
          </View>
          
          {/* Remember Me */}
          <TouchableOpacity
            style={styles.rememberContainer}
            onPress={() => !isLoading && setRememberMe(!rememberMe)}
            disabled={isLoading}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Remember me for 7 days</Text>
          </TouchableOpacity>
          
          {/* Login Attempts Warning */}
          {loginAttempts > 0 && !isBlocked && (
            <View style={styles.warningContainer}>
              <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.light.text.onPrimary} />
              <Text style={styles.warningText}>
                {5 - loginAttempts} attempts remaining
              </Text>
            </View>
          )}
          
          {/* Block Timer */}
          {isBlocked && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="lock-clock" size={16} color={Colors.light.text.onPrimary} />
              <Text style={styles.errorText}>
                Account locked for {Math.floor(blockTimer / 60)}:{(blockTimer % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          )}
          
          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              (isLoading || isBlocked) && styles.loginButtonDisabled
            ]}
            onPress={networkStatus.isOnline ? handleLogin : handleOfflineLogin}
            disabled={isLoading || isBlocked}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.light.text.onPrimary} />
                <Text style={[styles.loginButtonText, { marginLeft: 8 }]}>Logging in...</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>
                {networkStatus.isOnline ? 'Login' : 'Login Offline'}
              </Text>
            )}
          </TouchableOpacity>
          
          {/* Offline Mode Info */}
          {!networkStatus.isOnline && (
            <View style={styles.offlineInfo}>
              <MaterialCommunityIcons name="information-outline" size={16} color={Colors.light.text.secondary} />
              <Text style={styles.offlineInfoText}>
                You're offline. Tap "Login Offline" to use cached credentials.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background.primary,
  },
  
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.status.success,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  
  offline: {
    backgroundColor: Colors.light.status.warning,
  },
  
  connectionText: {
    color: Colors.light.text.onPrimary,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.primary.red,
    letterSpacing: 2,
  },
  
  logoSubtext: {
    fontSize: 14,
    color: Colors.light.secondary.navy,
    fontWeight: '600',
    marginTop: 4,
  },
  
  welcomeText: {
    fontSize: 20,
    color: Colors.light.text.primary,
    fontWeight: '600',
  },
  
  formContainer: {
    backgroundColor: Colors.light.background.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.light.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border.light,
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
  
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.light.border.medium,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  checkboxChecked: {
    backgroundColor: Colors.light.primary.red,
    borderColor: Colors.light.primary.red,
  },
  
  checkmark: {
    color: Colors.light.text.onPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  rememberText: {
    fontSize: 14,
    color: Colors.light.text.secondary,
  },
  
  warningContainer: {
    backgroundColor: Colors.light.status.warning,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  
  warningText: {
    color: Colors.light.text.onPrimary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  errorContainer: {
    backgroundColor: Colors.light.status.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  
  errorText: {
    color: Colors.light.text.onPrimary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  loginButton: {
    backgroundColor: Colors.light.primary.red,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.light.shadow.colored,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  
  loginButtonDisabled: {
    backgroundColor: Colors.light.text.light,
    shadowOpacity: 0,
    elevation: 0,
  },
  
  loginButtonText: {
    color: Colors.light.text.onPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  
  disabledButton: {
    opacity: 0.5,
  },
  
  forgotButtonText: {
    color: Colors.light.secondary.navy,
    fontSize: 16,
    fontWeight: '500',
  },
  
  networkWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.status.warning + '20',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  
  networkWarningText: {
    color: Colors.light.status.warning,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  offlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background.secondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  
  offlineInfoText: {
    color: Colors.light.text.secondary,
    fontSize: 12,
    textAlign: 'center',
    marginLeft: 6,
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  
  modalContainer: {
    backgroundColor: Colors.light.background.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text.primary,
    marginLeft: 12,
  },
  
  modalDescription: {
    fontSize: 14,
    color: Colors.light.text.secondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text.primary,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  
  orText: {
    textAlign: 'center',
    color: Colors.light.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    marginVertical: 16,
  },
  
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.light.background.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.light.border.medium,
  },
  
  cancelButtonText: {
    color: Colors.light.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  
  submitButton: {
    flex: 1,
    backgroundColor: Colors.light.primary.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 8,
  },
  
  submitButtonText: {
    color: Colors.light.text.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;