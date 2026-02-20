import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { authAPI, storageService } from '@/services/api';
import { networkService } from '@/services/networkService';
import { LoginRequest, LoginResponse } from '@/constants/api';
import { router } from 'expo-router';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  unique_code: string;
  must_change_password: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  isOffline: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    isOffline: false,
    connectionQuality: 'offline',
  });

  const authCheckedRef = useRef(false);
  const networkListenerRef = useRef<(() => void) | null>(null);

  // Initialize network service and set up listeners
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await networkService.initialize();
        
        // Set up network listener
        networkListenerRef.current = networkService.addNetworkListener((networkState) => {
          setAuthState(prev => ({
            ...prev,
            isOffline: !networkState.isConnected,
            connectionQuality: networkService.getConnectionQuality()
          }));
        });
        
        // Set initial network state
        const networkState = networkService.getNetworkState();
        setAuthState(prev => ({
          ...prev,
          isOffline: !networkState.isConnected,
          connectionQuality: networkService.getConnectionQuality()
        }));
        
        console.log('🌐 Network service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize services:', error);
      }
    };

    initializeServices();

    // Cleanup network listener
    return () => {
      if (networkListenerRef.current) {
        networkListenerRef.current();
      }
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out user...');
      
      // Clear all stored data
      await storageService.clearAuthData();
      await storageService.clearCredentials();
      
      // Clear network cache
      await networkService.clearCache();
      
      // Update auth state
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        isLoading: false,
      }));

      console.log('✅ Logout successful');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      
      // Force logout even if there's an error
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        isLoading: false,
      }));
      
      router.replace('/(auth)/login');
    }
  }, []);

  // Enhanced auth check with better error handling
  useEffect(() => {
    if (authCheckedRef.current) return;
    
    let isMounted = true;

    const checkAuthStatus = async () => {
      try {
        authCheckedRef.current = true;
        console.log('🔍 Checking authentication status...');
        
        const authData = await storageService.getAuthData();
        
        if (!isMounted) return;

        if (!authData.accessToken || !authData.userData) {
          console.log('❌ No valid auth data found');
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            user: null,
            isLoading: false,
          }));
          return;
        }

        // Validate token if online (with network service check)
        let shouldValidateToken = false;
        try {
          shouldValidateToken = networkService.isInitialized && networkService.isOnline();
        } catch (error) {
          console.warn('⚠️ Network check failed during auth validation:', error);
          shouldValidateToken = false;
        }

        if (shouldValidateToken) {
          try {
            // Try to refresh token to validate it
            if (authData.refreshToken) {
              await authAPI.refreshToken(authData.refreshToken);
              console.log('✅ Token validation successful');
            }
          } catch (error) {
            console.warn('⚠️ Token validation failed, clearing auth data');
            await storageService.clearAuthData();
            
            if (isMounted) {
              setAuthState(prev => ({
                ...prev,
                isAuthenticated: false,
                user: null,
                isLoading: false,
              }));
            }
            return;
          }
        }

        // Set authenticated state
        if (isMounted) {
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: true,
            user: authData.userData,
            isLoading: false,
          }));
          
          console.log('✅ Authentication check successful');
        }
        
      } catch (error) {
        console.error('❌ Error checking auth status:', error);
        
        if (isMounted) {
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            user: null,
            isLoading: false,
          }));
        }
      }
    };

    checkAuthStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest, rememberMe: boolean = false) => {
    try {
      console.log('🔑 Starting login process for:', credentials.email);
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Check network connectivity with fallback
      let isOnline = true;
      try {
        if (networkService.isInitialized) {
          isOnline = networkService.isOnline();
        } else {
          console.warn('⚠️ Network service not initialized, assuming online for login');
        }
      } catch (error) {
        console.warn('⚠️ Network check failed, assuming online:', error);
      }

      if (!isOnline) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Attempt login
      const loginResponse = await authAPI.login(credentials);
      
      // Validate login response
      if (!loginResponse || !loginResponse.access) {
        throw new Error('Invalid credentials. Please check your email and password and try again.');
      }
      
      // Save authentication data
      await storageService.saveAuthData(loginResponse);
      
      // Handle remember me functionality
      if (rememberMe) {
        await storageService.saveCredentials(credentials.email, credentials.password);
        console.log('💾 Credentials saved for remember me');
      } else {
        await storageService.clearCredentials();
      }

      // Update auth state
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        user: loginResponse.user || null,
        isLoading: false,
      }));

      console.log('✅ Login successful for:', credentials.email);
      
      return { 
        success: true,
        isFirstLogin: loginResponse.user?.must_change_password || false,
        mustChangePassword: loginResponse.user?.must_change_password || false 
      };
    } catch (error) {
      console.error('❌ Login failed for:', credentials.email, error);
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error instanceof Error) {
        // Handle specific error messages
        if (error.message.includes('Invalid email or password') || 
            error.message.includes('Invalid credentials') ||
            error.message.includes('400')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Account is disabled') || 
                   error.message.includes('suspended') ||
                   error.message.includes('403')) {
          errorMessage = 'Your account has been disabled. Please contact support.';
        } else if (error.message.includes('Too many login attempts') ||
                   error.message.includes('429')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
        } else if (error.message.includes('Network') || 
                   error.message.includes('timeout') ||
                   error.message.includes('connection')) {
          errorMessage = 'Connection failed. Please check your internet connection and try again.';
        } else if (error.message.includes('Server') ||
                   error.message.includes('500') ||
                   error.message.includes('unavailable')) {
          errorMessage = 'Server is temporarily unavailable. Please try again in a few minutes.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }, []);

  const offlineLogin = useCallback(async () => {
    try {
      console.log('📱 Attempting offline login...');
      
      const authData = await storageService.getAuthData();
      
      if (authData.accessToken && authData.userData) {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: authData.userData,
          isLoading: false,
          isOffline: true,
        }));
        
        console.log('✅ Offline login successful');
        return { success: true };
      } else {
        console.log('❌ No cached login data available');
        return { success: false, error: 'No cached login data found. Please connect to the internet to log in.' };
      }
    } catch (error) {
      console.error('❌ Offline login error:', error);
      return { success: false, error: 'Offline login failed. Please try again.' };
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      console.log('🔄 Refreshing authentication token...');
      
      const authData = await storageService.getAuthData();
      
      if (authData.refreshToken) {
        const response = await authAPI.refreshToken(authData.refreshToken);
        
        // Only save if we have valid data
        if (response.access) {
          await storageService.saveAuthData({
            access: response.access,
            refresh: authData.refreshToken,
            user: authData.userData,
          });
          
          console.log('✅ Token refresh successful');
          return { success: true };
        } else {
          console.log('❌ Invalid token refresh response');
          await logout();
          return { success: false, error: 'Invalid token refresh response' };
        }
      } else {
        console.log('❌ No refresh token available');
        await logout();
        return { success: false, error: 'No refresh token found' };
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      await logout();
      return { success: false, error: 'Token refresh failed' };
    }
  }, [logout]);

  const requestPasswordReset = useCallback(async (emailOrUsername: string) => {
    try {
      console.log('🔄 Requesting password reset for:', emailOrUsername);
      
      if (!networkService.isOnline()) {
        throw new Error('Internet connection required for password reset');
      }
      
      await authAPI.requestPasswordReset(emailOrUsername);
      
      console.log('✅ Password reset request successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Password reset request failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
      return { success: false, error: errorMessage };
    }
  }, []);

  const getSavedCredentials = useCallback(async () => {
    try {
      return await storageService.getCredentials();
    } catch (error) {
      console.error('❌ Error getting saved credentials:', error);
      return null;
    }
  }, []);

  const isRememberMeEnabled = useCallback(async () => {
    try {
      return await storageService.isRememberMeEnabled();
    } catch (error) {
      console.error('❌ Error checking remember me:', error);
      return false;
    }
  }, []);

  // Get network status for UI
  const getNetworkStatus = useCallback(() => {
    try {
      if (!networkService.isInitialized) {
        return {
          isOnline: true, // Assume online if not initialized
          quality: 'good' as const,
          isWeak: false,
        };
      }
      
      return {
        isOnline: networkService.isOnline(),
        quality: networkService.getConnectionQuality(),
        isWeak: networkService.isWeakConnection(),
      };
    } catch (error) {
      console.warn('⚠️ Error getting network status:', error);
      return {
        isOnline: true,
        quality: 'good' as const,
        isWeak: false,
      };
    }
  }, []);

  return {
    ...authState,
    login,
    logout,
    offlineLogin,
    refreshToken,
    requestPasswordReset,
    getSavedCredentials,
    isRememberMeEnabled,
    getNetworkStatus,
  };
};