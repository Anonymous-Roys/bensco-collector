import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, LoginRequest, LoginResponse, ApiError, STORAGE_KEYS } from '@/constants/api';
import { Client, ClientListResponse, Contribution, ContributionCreateRequest, ContributionListResponse } from '@/constants/types';


interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
  }

  
// Create axios instance with default configuration
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          const response = await axios.post(`${API_CONFIG.BASE_URL}${API_CONFIG.AUTH.REFRESH}`, {
            refresh: refreshToken,
          });
          
          const { access } = response.data;
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, clear storage and redirect to login
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER_DATA,
        ]);
        // You might want to dispatch a logout action here
      }
    }
    
    return Promise.reject(error);
  }
);

// Authentication API methods
export const authAPI = {
  // Login user
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const response: AxiosResponse<LoginResponse> = await api.post(
        API_CONFIG.AUTH.LOGIN,
        credentials
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Login failed' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },

  // Request password reset
  requestPasswordReset: async (emailOrUsername: string): Promise<void> => {
    try {
      await api.post(API_CONFIG.AUTH.RESET_REQUEST, {
        email_or_username: emailOrUsername,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Password reset request failed' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
    try {
      const response = await api.post(API_CONFIG.AUTH.REFRESH, {
        refresh: refreshToken,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Token refresh failed' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
};

// Client API methods
export const clientAPI = {
  // Get all clients
  getClients: async (): Promise<ClientListResponse> => {
    try {
      const response: AxiosResponse<ClientListResponse> = await api.get(API_CONFIG.CLIENTS.LIST);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to fetch clients' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },

  // Create a new client
  createClient: async (clientData: Partial<Client>): Promise<Client> => {
    try {
      const response: AxiosResponse<Client> = await api.post(API_CONFIG.CLIENTS.CREATE, clientData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to create client' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },

  // Get client profile
  getClientProfile: async (clientId: string): Promise<Client> => {
    try {
      const response: AxiosResponse<Client> = await api.get(API_CONFIG.CLIENTS.PROFILE.replace(':id', clientId));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to fetch client profile' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
};

// Contribution API methods
export const contributionAPI = {
  // Get all contributions
  getContributions: async (): Promise<Contribution[]> => {
    try {
      const response: AxiosResponse<ContributionListResponse> = await api.get(API_CONFIG.CONTRIBUTIONS.LIST);
      const data = response.data as any;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      return [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to fetch contributions' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },

  // Create a new contribution
  createContribution: async (contributionData: ContributionCreateRequest): Promise<Contribution> => {
    try {
      const response: AxiosResponse<Contribution> = await api.post(API_CONFIG.CONTRIBUTIONS.CREATE, contributionData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to create contribution' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },

  // Get contributions by client
  getContributionsByClient: async (clientId: string): Promise<Contribution[]> => {
    try {
      const url = API_CONFIG.CONTRIBUTIONS.BY_CLIENT.replace(':client_id', clientId);
      const response: AxiosResponse<ContributionListResponse> = await api.get(url);
      const data = response.data as any;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      return [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to fetch client contributions' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },

  // Bulk create contributions
  bulkCreateContributions: async (payload: ContributionCreateRequest[]): Promise<Contribution[]> => {
    try {
      const response: AxiosResponse<ContributionListResponse> = await api.post(API_CONFIG.CONTRIBUTIONS.BULK_CREATE, payload);
      const data = response.data as any;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      return [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to bulk create contributions' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
};

// Payouts API methods
export const payoutsAPI = {
  requestPayout: async (payload: any): Promise<any> => {
    try {
      const response = await api.post(API_CONFIG.PAYOUTS.REQUEST, payload);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to request payout' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
  listPayouts: async (): Promise<any> => {
    try {
      const response = await api.get(API_CONFIG.PAYOUTS.LIST);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to list payouts' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
  approvePayout: async (id: string): Promise<any> => {
    try {
      const response = await api.post(API_CONFIG.PAYOUTS.APPROVE.replace(':id', id));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to approve payout' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
  rejectPayout: async (id: string): Promise<any> => {
    try {
      const response = await api.post(API_CONFIG.PAYOUTS.REJECT.replace(':id', id));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to reject payout' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
  markPayoutPaid: async (id: string): Promise<any> => {
    try {
      const response = await api.post(API_CONFIG.PAYOUTS.MARK_PAID.replace(':id', id));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to mark payout paid' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
};

// Storage service for offline functionality
export const storageService = {
  // Save authentication data
  saveAuthData: async (loginResponse: LoginResponse): Promise<void> => {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, loginResponse.access],
        [STORAGE_KEYS.REFRESH_TOKEN, loginResponse.refresh],
        [STORAGE_KEYS.USER_DATA, JSON.stringify(loginResponse.user)],
      ]);
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  },

  // Get authentication data
  getAuthData: async (): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    userData: any | null;
  }> => {
    try {
      const [accessToken, refreshToken, userData] = await AsyncStorage.multiGet([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
   
      return {
        accessToken: accessToken[1],
        refreshToken: refreshToken[1],
        userData: userData[1] ? JSON.parse(userData[1]) : null,
      };
    } catch (error) {
      console.error('Error getting auth data:', error);
      return { accessToken: null, refreshToken: null, userData: null };
    }
  },

  // Clear authentication data
  clearAuthData: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  },

  // Save credentials for remember me
  saveCredentials: async (email: string, password: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify({ email, password }));
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    } catch (error) {
      console.error('Error saving credentials:', error);
      throw error;
    }
  },

  // Get saved credentials
  getCredentials: async (): Promise<{ email: string; password: string } | null> => {
    try {
      const credentials = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
      return credentials ? JSON.parse(credentials) : null;
    } catch (error) {
      console.error('Error getting credentials:', error);
      return null;
    }
  },

  // Clear saved credentials
  clearCredentials: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.CREDENTIALS, STORAGE_KEYS.REMEMBER_ME]);
    } catch (error) {
      console.error('Error clearing credentials:', error);
      throw error;
    }
  },

  // Check if remember me is enabled
  isRememberMeEnabled: async (): Promise<boolean> => {
    try {
      const rememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
      return rememberMe === 'true';
    } catch (error) {
      console.error('Error checking remember me:', error);
      return false;
    }
  },
};

export default api;
