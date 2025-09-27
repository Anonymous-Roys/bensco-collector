import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { authAPI, storageService } from '@/services/api';
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
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    isOffline: false,
  });

  const authCheckedRef = useRef(false); // Prevent multiple auth checks

  const logout = useCallback(async () => {
    try {
      // Clear all stored data
      await storageService.clearAuthData();
      await storageService.clearCredentials();
      
      // Update auth state
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        isOffline: false,
      });

      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, we should still clear the state
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        isOffline: false,
      });
      router.replace('/(auth)/login');
    }
  }, []);

  // Check authentication status on app start - ONLY ONCE
  useEffect(() => {
    if (authCheckedRef.current) return; // Prevent multiple calls
    
    let isMounted = true;

    const checkAuthStatus = async () => {
      try {
        authCheckedRef.current = true; // Mark as checked
        
        const authData = await storageService.getAuthData();
        
        if (!isMounted) return; // Prevent state updates if unmounted

        // If no accessToken or userData, set logged out state
        if (!authData.accessToken || !authData.userData) {
          console.log('No auth data found, setting logged out state');
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            isOffline: false,
          });
          return;
        }

        // Update auth state
        setAuthState({
          isAuthenticated: true,
          user: authData.userData,
          isLoading: false,
          isOffline: false,
        });
        
      } catch (error) {
        console.error('Error checking auth status:', error);
        if (isMounted) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            isOffline: false,
          });
        }
      }
    };

    checkAuthStatus();

    return () => {
      isMounted = false; // Cleanup
    };
  }, []); // Empty dependency array - runs only once

  const login = useCallback(async (credentials: LoginRequest, rememberMe: boolean = false) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Call login API
      const loginResponse = await authAPI.login(credentials);
      
      // Save authentication data
      await storageService.saveAuthData(loginResponse);
      
      // Handle remember me functionality
      if (rememberMe) {
        await storageService.saveCredentials(credentials.email, credentials.password);
      } else {
        await storageService.clearCredentials();
      }

      // Update auth state
      setAuthState({
        isAuthenticated: true,
        user: loginResponse.user || null,
        isLoading: false,
        isOffline: false,
      });

      return { 
        success: true,
        isFirstLogin: loginResponse.user?.must_change_password || false,
        mustChangePassword: loginResponse.user?.must_change_password || false 
      };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: errorMessage };
    }
  }, []);

  const offlineLogin = useCallback(async () => {
    try {
      const authData = await storageService.getAuthData();
      
      if (authData.accessToken && authData.userData) {
        setAuthState({
          isAuthenticated: true,
          user: authData.userData,
          isLoading: false,
          isOffline: true,
        });
        return { success: true };
      } else {
        // Don't redirect here - let the component handle it based on authState
        return { success: false, error: 'No cached login data found' };
      }
    } catch (error) {
      console.error('Error during offline login:', error);
      return { success: false, error: 'Offline login failed' };
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const authData = await storageService.getAuthData();
      
      if (authData.refreshToken) {
        const response = await authAPI.refreshToken(authData.refreshToken);
        await storageService.saveAuthData({
          access: response.access,
          refresh: authData.refreshToken,
          user: authData.userData,
        });
        return { success: true };
      } else {
        await logout();
        return { success: false, error: 'No refresh token found' };
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      await logout();
      return { success: false, error: 'Token refresh failed' };
    }
  }, [logout]);

  const requestPasswordReset = useCallback(async (emailOrUsername: string) => {
    try {
      await authAPI.requestPasswordReset(emailOrUsername);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
      return { success: false, error: errorMessage };
    }
  }, []);

  const getSavedCredentials = useCallback(async () => {
    try {
      return await storageService.getCredentials();
    } catch (error) {
      console.error('Error getting saved credentials:', error);
      return null;
    }
  }, []);

  const isRememberMeEnabled = useCallback(async () => {
    try {
      return await storageService.isRememberMeEnabled();
    } catch (error) {
      console.error('Error checking remember me:', error);
      return false;
    }
  }, []);

  // Remove checkAuthStatus from return since it's handled internally
  return {
    ...authState,
    login,
    logout,
    offlineLogin,
    refreshToken,
    requestPasswordReset,
    getSavedCredentials,
    isRememberMeEnabled,
  };
};