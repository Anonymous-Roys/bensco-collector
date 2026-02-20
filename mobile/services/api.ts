import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, LoginRequest, LoginResponse, ApiError, STORAGE_KEYS } from '@/constants/api';
import { Client, ClientListResponse, Contribution, ContributionCreateRequest, ContributionListResponse } from '@/constants/types';
import { networkService } from './networkService';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// Enhanced API configuration with adaptive timeout settings
const API_TIMEOUTS = {
  default: 30000,
  login: 45000,
  upload: 60000,
  download: 45000,
  slow: 90000,     // Increased for very slow servers
  fallback: 15000, // Quick fallback for pagination
};

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 2000,  // Increased from 1s to 2s
  maxDelay: 15000   // Increased from 8s to 15s
};

// Helper function to get adaptive timeout based on connection quality
function getAdaptiveTimeout(defaultTimeout: number): number {
  try {
    if (networkService.isInitialized) {
      const quality = networkService.getConnectionQuality();
      switch (quality) {
        case 'poor':
        case 'offline':
          return API_TIMEOUTS.slow;
        case 'fair':
          return Math.max(defaultTimeout * 1.5, 30000);
        case 'good':
        case 'excellent':
        default:
          return defaultTimeout;
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not determine connection quality, using default timeout');
  }
  return defaultTimeout;
}

// Create axios instance with enhanced configuration
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_TIMEOUTS.default,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  validateStatus: (status) => status < 500,
});

// Enhanced request interceptor with network checking
api.interceptors.request.use(
  async (config) => {
    try {
      // Check network connectivity before making request - with fallback
      let isOnline = true;
      try {
        if (networkService.isInitialized) {
          isOnline = networkService.isOnline();
        } else {
          // Fallback: try to initialize network service if not already done
          await networkService.initialize();
          isOnline = networkService.isOnline();
        }
      } catch (networkError) {
        console.warn('⚠️ Network check failed, assuming online:', networkError);
        // Assume online if network service fails - let the actual request determine connectivity
        isOnline = true;
      }

      // Only block request if we're definitely offline
      if (!isOnline) {
        throw new Error('No internet connection available');
      }

      // Add auth token
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add request timestamp for debugging
      config.metadata = { startTime: Date.now() };
      
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      
      return config;
    } catch (error) {
      console.error('❌ Request interceptor error:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('❌ Request setup error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with better error handling and retry logic
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful requests
    const duration = Date.now() - (response.config.metadata?.startTime || 0);
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Log error details
    const duration = Date.now() - (originalRequest.metadata?.startTime || 0);
    console.error(`❌ API Error: ${originalRequest.method?.toUpperCase()} ${originalRequest.url} (${duration}ms)`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    // Handle different types of errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.warn('⏱️ Request timeout, checking network and retrying...');
      
      // For timeout errors, always retry with longer timeout
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        originalRequest.timeout = getAdaptiveTimeout(API_TIMEOUTS.slow);
        console.log(`🔄 Retrying with extended timeout: ${originalRequest.timeout}ms`);
        return api(originalRequest);
      }
    }

    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      console.warn('🌐 Network error detected');
      
      // Cache the request for retry when connection is restored
      if (networkService.isOnline() && !originalRequest._retry) {
        return retryRequest(originalRequest, error);
      }
      
      throw new Error('Network connection failed. Please check your internet connection.');
    }

    // Handle 401 Unauthorized - token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          console.log('🔄 Attempting token refresh...');
          
          const response = await axios.post(`${API_CONFIG.BASE_URL}${API_CONFIG.AUTH.REFRESH}`, {
            refresh: refreshToken,
          }, {
            timeout: API_TIMEOUTS.login
          });
          
          const { access } = response.data;
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          console.log('✅ Token refreshed, retrying original request...');
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        
        // Clear auth data and redirect to login
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER_DATA,
        ]);
        
        throw new Error('Session expired. Please log in again.');
      }
    }

    // Handle server errors (5xx) with retry
    if (error.response?.status >= 500 && !originalRequest._retry) {
      console.warn('🔧 Server error, attempting retry...');
      return retryRequest(originalRequest, error);
    }

    // Handle rate limiting (429)
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
      
      console.warn(`⏳ Rate limited, waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (!originalRequest._retry) {
        return retryRequest(originalRequest, error);
      }
    }
    
    return Promise.reject(error);
  }
);

// Enhanced retry function with exponential backoff
async function retryRequest(originalRequest: CustomAxiosRequestConfig, error: AxiosError): Promise<any> {
  originalRequest._retry = true;
  originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

  if (originalRequest._retryCount > RETRY_CONFIG.maxRetries) {
    console.error(`❌ Max retries (${RETRY_CONFIG.maxRetries}) exceeded for ${originalRequest.url}`);
    return Promise.reject(error);
  }

  // Calculate delay with exponential backoff and jitter
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, originalRequest._retryCount - 1),
    RETRY_CONFIG.maxDelay
  );
  const jitteredDelay = delay + Math.random() * 1000;

  console.log(`🔄 Retrying request ${originalRequest._retryCount}/${RETRY_CONFIG.maxRetries} in ${Math.round(jitteredDelay)}ms...`);
  
  await new Promise(resolve => setTimeout(resolve, jitteredDelay));
  
  // Check network before retry
  if (!networkService.isOnline()) {
    throw new Error('Network connection lost during retry');
  }

  return api(originalRequest);
}

// Enhanced Authentication API methods with better timeout handling
export const authAPI = {
  // Login user with enhanced error handling and adaptive timeout
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const operationId = `login_${credentials.email}`;
    
    return networkService.executeWithRetry(async () => {
      try {
        console.log('🔑 Attempting login for:', credentials.email);
        
        const timeout = getAdaptiveTimeout(API_TIMEOUTS.login);
        console.log(`🕐 Using timeout: ${timeout}ms for login`);
        
        const response: AxiosResponse<LoginResponse> = await api.post(
          API_CONFIG.AUTH.LOGIN,
          credentials,
          { 
            timeout,
            headers: {
              'X-Request-ID': operationId,
            }
          }
        );
        
        console.log('✅ Login successful for:', credentials.email);
        
        // Cache successful login response
        await networkService.cacheData(`login_${credentials.email}`, response.data, 300000); // 5 minutes
        
        return response.data;
      } catch (error) {
        console.error('❌ Login failed for:', credentials.email, error);
        
        if (axios.isAxiosError(error)) {
          // Handle specific HTTP errors
          if (error.response?.status === 400) {
            throw new Error('Invalid email or password');
          } else if (error.response?.status === 403) {
            throw new Error('Account is disabled or suspended');
          } else if (error.response?.status === 429) {
            throw new Error('Too many login attempts. Please try again later.');
          } else if (error.response?.status >= 500) {
            throw new Error('Server is temporarily unavailable. Please try again.');
          }
          
          const apiError: ApiError = error.response?.data || { detail: 'Login failed' };
          throw new Error(apiError.detail);
        }
        
        // Handle network errors
        if (error.message.includes('Network') || error.message.includes('timeout')) {
          throw new Error('Connection failed. Please check your internet connection.');
        }
        
        throw error;
      }
    }, operationId, {
      maxRetries: 2, // Fewer retries for login to avoid account lockout
      baseDelay: 2000,
      maxDelay: 5000
    });
  },

  // Request password reset with adaptive timeout
  requestPasswordReset: async (emailOrUsername: string): Promise<void> => {
    const operationId = `password_reset_${emailOrUsername}`;
    
    return networkService.executeWithRetry(async () => {
      try {
        console.log('🔄 Requesting password reset for:', emailOrUsername);
        
        const timeout = getAdaptiveTimeout(API_TIMEOUTS.login);
        console.log(`🕐 Using timeout: ${timeout}ms for password reset`);
        
        await api.post(API_CONFIG.AUTH.RESET_REQUEST, {
          email_or_username: emailOrUsername,
        }, {
          timeout,
          headers: {
            'X-Request-ID': operationId,
          }
        });
        
        console.log('✅ Password reset request sent for:', emailOrUsername);
      } catch (error) {
        console.error('❌ Password reset failed for:', emailOrUsername, error);
        
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            throw new Error('Email or username not found');
          } else if (error.response?.status === 429) {
            throw new Error('Too many reset requests. Please try again later.');
          }
          
          const apiError: ApiError = error.response?.data || { detail: 'Password reset request failed' };
          throw new Error(apiError.detail);
        }
        
        throw error;
      }
    }, operationId);
  },

  // Refresh token with adaptive timeout
  refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
    const operationId = 'token_refresh';
    
    return networkService.executeWithRetry(async () => {
      try {
        console.log('🔄 Refreshing access token...');
        
        const timeout = getAdaptiveTimeout(API_TIMEOUTS.login);
        console.log(`🕐 Using timeout: ${timeout}ms for token refresh`);
        
        const response = await api.post(API_CONFIG.AUTH.REFRESH, {
          refresh: refreshToken,
        }, {
          timeout,
          headers: {
            'X-Request-ID': operationId,
          }
        });
        
        console.log('✅ Token refreshed successfully');
        return response.data;
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            throw new Error('Refresh token expired');
          }
          
          const apiError: ApiError = error.response?.data || { detail: 'Token refresh failed' };
          throw new Error(apiError.detail);
        }
        
        throw error;
      }
    }, operationId, {
      maxRetries: 2, // More retries for token refresh
      baseDelay: 2000
    });
  },
};

// Client API methods with adaptive timeouts
export const clientAPI = {
  // Get all clients with adaptive timeout
  getClients: async (params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<ClientListResponse> => {
    try {
      const url = new URL(`${API_CONFIG.BASE_URL}${API_CONFIG.CLIENTS.LIST}`);
      
      if (params?.search) {
        url.searchParams.set('search', params.search);
      }
      
      if (params?.page) {
        url.searchParams.set('page', params.page.toString());
      }
      
      const pageSize = params?.page_size || 15;
      url.searchParams.set('page_size', pageSize.toString());
      
      const timeout = getAdaptiveTimeout(API_TIMEOUTS.fallback);
      console.log(`🕐 Using timeout: ${timeout}ms for clients (page: ${params?.page || 1}, page_size: ${pageSize})`);
      
      const response: AxiosResponse<ClientListResponse> = await api.get(url.toString(), {
        timeout
      });
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

// Contribution API methods with adaptive timeouts
export const contributionAPI = {
  // Get all contributions with adaptive timeout
  getContributions: async (): Promise<Contribution[]> => {
    try {
      const timeout = getAdaptiveTimeout(API_TIMEOUTS.fallback);
      console.log(`🕐 Using timeout: ${timeout}ms for contributions (page_size: 5)`);
      
      const response: AxiosResponse<ContributionListResponse> = await api.get(
        `${API_CONFIG.CONTRIBUTIONS.LIST}?page_size=5`,
        { timeout }
      );
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

  // Get collector stats with adaptive timeout
  getCollectorStats: async (): Promise<any> => {
    try {
      const timeout = getAdaptiveTimeout(API_TIMEOUTS.fallback);
      const response = await api.get(API_CONFIG.CONTRIBUTIONS.COLLECTOR_STATS, { timeout });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to fetch collector stats' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },

  // Get grouped contributions by date
  getGroupedContributions: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<any> => {
    try {
      const url = new URL(`${API_CONFIG.BASE_URL}${API_CONFIG.CONTRIBUTIONS.GROUPED}`);
      
      if (params?.page) {
        url.searchParams.set('page', params.page.toString());
      }
      
      const pageSize = params?.page_size || 10;
      url.searchParams.set('page_size', pageSize.toString());
      
      const timeout = getAdaptiveTimeout(API_TIMEOUTS.fallback);
      console.log(`🕐 Using timeout: ${timeout}ms for grouped contributions (page: ${params?.page || 1}, page_size: ${pageSize})`);
      
      const response = await api.get(url.toString(), { timeout });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to fetch grouped contributions' };
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
  getContributionsByClient: async (clientId: string, page?: number): Promise<any> => {
    try {
      const url = new URL(`${API_CONFIG.BASE_URL}${API_CONFIG.CONTRIBUTIONS.BY_CLIENT.replace(':client_id', clientId)}`);
      
      if (page) {
        url.searchParams.set('page', page.toString());
      }
      
      // Set page size for contribution history
      url.searchParams.set('page_size', '10');
      
      const timeout = getAdaptiveTimeout(API_TIMEOUTS.fallback);
      console.log(`🕐 Using timeout: ${timeout}ms for client contributions (page: ${page || 1})`);
      
      const response = await api.get(url.toString(), { timeout });
      return response.data;
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

// Savings cycle API methods
export const savingsAPI = {
  getClientCycles: async (clientId: string): Promise<any> => {
    try {
      const url = API_CONFIG.SAVINGS.CLIENT_CYCLES.replace(':client_id', clientId);
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to fetch client cycles' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
  closeCycle: async (clientId: string): Promise<any> => {
    try {
      const url = API_CONFIG.SAVINGS.CLOSE_CYCLE.replace(':client_id', clientId);
      const response = await api.post(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || { detail: 'Failed to close cycle' };
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
  requestClientPayout: async (clientId: string, requestedAmount: number): Promise<any> => {
    try {
      const url = API_CONFIG.PAYOUTS.REQUEST_CLIENT.replace(':client_id', clientId);
      const payload = { requested_amount: requestedAmount.toString() };
      console.log('Requesting payout:', { url: `${API_CONFIG.BASE_URL}${url}`, payload });
      const response = await api.post(url, payload);
      return response.data;
    } catch (error) {
      console.error('Payout request error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        const apiError: ApiError = error.response?.data || { detail: 'Failed to request client payout' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
  getClientBalance: async (clientId: string): Promise<any> => {
    try {
      const url = API_CONFIG.PAYOUTS.CLIENT_BALANCE.replace(':client_id', clientId);
      console.log('Fetching client balance from:', `${API_CONFIG.BASE_URL}${url}`);
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Client balance API error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        const apiError: ApiError = error.response?.data || { detail: 'Failed to get client balance' };
        throw new Error(apiError.detail);
      }
      throw error;
    }
  },
  listPayouts: async (): Promise<any> => {
    const endpoints = [
      '/pay/my-payouts/',
      API_CONFIG.PAYOUTS.LIST,
      '/payouts/list/',
      '/pay/requests/',
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying payout endpoint: ${endpoint}`);
        const response = await api.get(endpoint);
        console.log(`Success with endpoint ${endpoint}:`, response.data);
        return Array.isArray(response.data) ? response.data : response.data.results || [];
      } catch (error) {
        console.warn(`Endpoint ${endpoint} failed:`, error);
        continue;
      }
    }
    
    console.warn('All payout endpoints failed, returning empty array');
    return [];
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
      const dataToSave: [string, string][] = [];
      
      if (loginResponse.access) {
        dataToSave.push([STORAGE_KEYS.AUTH_TOKEN, loginResponse.access]);
      }
      
      if (loginResponse.refresh) {
        dataToSave.push([STORAGE_KEYS.REFRESH_TOKEN, loginResponse.refresh]);
      }
      
      if (loginResponse.user) {
        dataToSave.push([STORAGE_KEYS.USER_DATA, JSON.stringify(loginResponse.user)]);
      }
      
      if (dataToSave.length > 0) {
        await AsyncStorage.multiSet(dataToSave);
      }
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
