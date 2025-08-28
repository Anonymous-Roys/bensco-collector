// API Configuration for Bensco Susu App
export const API_CONFIG = {
  // Base URL - change this based on your environment
  BASE_URL: 'http://localhost:8000', // Development
  // BASE_URL: 'https://your-production-domain.com', // Production
  
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login/',
    REFRESH: '/auth/token/refresh/',
    RESET_REQUEST: '/auth/collector-password-reset-request/',
  },
  
  // Client endpoints
  CLIENTS: {
    LIST: '/clients/list/',
    CREATE: '/clients/create/',
    PROFILE: '/clients/:id/',
  },
  
  // Contribution endpoints
  CONTRIBUTIONS: {
    LIST: '/contributions/',
    CREATE: '/contributions/create/',
    BY_CLIENT: '/contributions/client/:client_id/',
    BULK_CREATE: '/contributions/create/bulk/',
  },
  
  // Payout endpoints
  PAYOUTS: {
    REQUEST: '/payouts/request/',
    APPROVE: '/payouts/approve/:id/',
    LIST: '/payouts/list/',
    REJECT: '/payouts/reject/:id/',
    MARK_PAID: '/payouts/mark-paid/:id/',
  },
};

// API Response types
export interface LoginResponse {
  access: string;
  refresh: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    unique_code: string;
    must_change_password: boolean;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiError {
  detail: string;
  code?: string;
}

// Storage keys for offline functionality
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  OFFLINE_DATA: 'offline_data',
  REMEMBER_ME: 'remember_me',
  CREDENTIALS: 'credentials',
};
