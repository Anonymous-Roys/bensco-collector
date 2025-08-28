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
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { authAPI, storageService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

// const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  // Add other screens here
};

interface LoginScreenProps {
  // Add any props you might need
}

const LoginScreen: React.FC<LoginScreenProps> = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockTimer, setBlockTimer] = useState<number>(0);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetPhone, setResetPhone] = useState<string>('');

  // Use auth hook
  const { login, offlineLogin, requestPasswordReset, getSavedCredentials, isLoading } = useAuth();

  // const router = useRouter();
  // Simulate network status
 useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setIsOffline(!state.isConnected);
  });
  return () => unsubscribe();
}, []);

  // Load saved credentials on component mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const credentials = await getSavedCredentials();
        if (credentials) {
          setEmail(credentials.email);
          setPassword(credentials.password);
          setRememberMe(true);
        }
      } catch (error) {
        console.log("Couldn't load saved credentials!", error);
      }
    };

    loadCredentials();
  }, [getSavedCredentials]);

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
    if (isBlocked) {
      Alert.alert(
        "Account Temporarily Locked",
        `Please wait ${blockTimer} seconds before trying again.`,
        [{ text: "OK" }]
      );
      
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter both email and password.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      // Use auth hook for login
      const result = await login({ email, password }, rememberMe);
      
      if (result.success) {
        // Success - navigate to main app
        console.log("🔑 Login successful, navigating to tabs...");
        router.replace('/(tabs)');
        setLoginAttempts(0);
      } else {
        // Handle login failure
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
            `${result.error} ${5 - newAttempts} attempts remaining.`,
            [{ text: "Try Again" }]
          );
        }
      }
    } catch (error) {
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
        const errorMessage = error instanceof Error ? error.message : "Login failed. Please try again.";
        Alert.alert(
          "Login Failed",
          `${errorMessage} ${5 - newAttempts} attempts remaining.`,
          [{ text: "Try Again" }]
        );
      }
    }
  };

  const handleOfflineLogin = async (): Promise<void> => {
    try {
      const result = await offlineLogin();
      
      if (result.success) {
        console.log("🔑 Offline login successful, navigating to tabs...");
        router.replace('/(tabs)');
      } else {
        Alert.alert(
          "Offline Login Failed",
          result.error || "No cached login data found. Please connect to the internet to log in.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Offline login error:", error);
      Alert.alert(
        "Offline Login Error",
        "Unable to access cached login data. Please connect to the internet.",
        [{ text: "OK" }]
      );
    }
  };

  const handleForgotPassword = (): void => {
    setShowForgotPassword(true);
  };

  const submitPasswordReset = async (): Promise<void> => {
    const identifier = resetEmail.trim() || resetPhone.trim();
    
    if (!identifier) {
      Alert.alert("Missing Information", "Please enter either your email or phone number.");
      return;
    }

    try {
      const result = await requestPasswordReset(identifier);
      
      if (result.success) {
        Alert.alert(
          "Reset Request Sent",
          "Your password reset request has been sent to the admin. You will receive new login credentials within 24 hours.",
          [{ text: "OK", onPress: () => setShowForgotPassword(false) }]
        );
        
        // Clear form
        setResetEmail('');
        setResetPhone('');
      } else {
        Alert.alert("Error", result.error || "Password reset request failed.", [{ text: "OK" }]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Password reset request failed.";
      Alert.alert("Error", errorMessage, [{ text: "OK" }]);
    }
  };

  const ForgotPasswordModal: React.FC = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <MaterialCommunityIcons name="shield-account" size={24} color={Colors.light.primary.red} />
          <Text style={styles.modalTitle}>Password Reset Request</Text>
        </View>
        
        <Text style={styles.modalDescription}>
          Enter your email or phone number. The admin will send you new login credentials via SMS.
        </Text>
        
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="email-outline" size={20} color={Colors.light.text.secondary} />
          <TextInput
            style={styles.modalInput}
            placeholder="Email address"
            value={resetEmail}
            onChangeText={setResetEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <Text style={styles.orText}>OR</Text>
        
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="phone-outline" size={20} color={Colors.light.text.secondary} />
          <TextInput
            style={styles.modalInput}
            placeholder="Phone number"
            value={resetPhone}
            onChangeText={setResetPhone}
            keyboardType="phone-pad"
          />
        </View>
        
        <View style={styles.modalButtons}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setShowForgotPassword(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={submitPasswordReset}
          >
            <Text style={styles.submitButtonText}>Send Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.light.primary.red} />
      
      {/* Connection Status */}
      <View style={[styles.connectionStatus, isOffline && styles.offline]}>
        {isOffline ? (
          <MaterialCommunityIcons name="wifi-off" size={16} color={Colors.light.text.onPrimary} />
        ) : (
          <MaterialCommunityIcons name="wifi" size={16} color={Colors.light.text.onPrimary} />
        )}
        <Text style={styles.connectionText}>
          {isOffline ? 'Offline Mode' : 'Connected'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>BENSCO</Text>
            <Text style={styles.logoSubtext}>SUSU LIMITED</Text>
          </View>
          <Text style={styles.welcomeText}>Field Worker Login</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="account-outline" size={20} color={Colors.light.text.secondary} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
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
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Remember me for 7 days</Text>
          </TouchableOpacity>

          {/* Login Attempts Warning */}
          {loginAttempts > 0 && !isBlocked && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                {5 - loginAttempts} attempts remaining
              </Text>
            </View>
          )}

          {/* Block Timer */}
          {isBlocked && (
            <View style={styles.errorContainer}>
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
            onPress={isOffline ? handleOfflineLogin : handleLogin}
            disabled={isLoading || isBlocked}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.light.text.onPrimary} />
            ) : (
              <Text style={styles.loginButtonText}>
                {isOffline ? 'Login Offline' : 'Login'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity 
            style={styles.forgotButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotButtonText}>
              Forgot Password? Request Reset
            </Text>
          </TouchableOpacity>

          {/* Demo Credentials */}
          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Demo Credentials:</Text>
            <Text style={styles.demoText}>Email: davidarhin2005@gmail.com</Text>
            <Text style={styles.demoText}>Password: davelled</Text>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      {showForgotPassword && <ForgotPasswordModal />}
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
  
  forgotButtonText: {
    color: Colors.light.secondary.navy,
    fontSize: 16,
    fontWeight: '500',
  },
  
  demoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.light.neutral.cream,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.accent.gold,
  },
  
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text.primary,
    marginBottom: 8,
  },
  
  demoText: {
    fontSize: 12,
    color: Colors.light.text.secondary,
    fontFamily: 'monospace',
  },
  
  // Modal Styles
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