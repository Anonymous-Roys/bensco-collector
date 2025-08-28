# Bensco Susu - Login System Implementation

## Overview

The login system has been updated to use real API integration with the Django backend. The system now supports:

- Real API authentication with JWT tokens
- Offline login with cached credentials
- Remember me functionality
- Password reset requests
- Automatic token refresh
- Secure credential storage

## API Configuration

### Base URL
The API base URL is configured in `constants/api.ts`:
```typescript
BASE_URL: 'http://localhost:8000', // Development
// BASE_URL: 'https://your-production-domain.com', // Production
```

### Endpoints
- **Login**: `POST /auth/login/`
- **Token Refresh**: `POST /auth/token/refresh/`
- **Password Reset**: `POST /auth/collector-password-reset-request/`

## Features

### 1. Real API Integration
- Uses axios for HTTP requests
- JWT token-based authentication
- Automatic token refresh on 401 errors
- Proper error handling with user-friendly messages

### 2. Offline Functionality
- Caches authentication tokens in AsyncStorage
- Allows login with cached credentials when offline
- Graceful fallback when no cached data is available

### 3. Remember Me
- Securely stores credentials for automatic login
- Can be enabled/disabled by user
- Automatically loads saved credentials on app start

### 4. Security Features
- Rate limiting (5 attempts before temporary lockout)
- Account blocking for 5 minutes after failed attempts
- Secure token storage
- Automatic logout on token expiration

## Usage

### Login Credentials
For testing, use these credentials:
- **Email**: `davidarhin2005@gmail.com`
- **Password**: `davelled`

### Offline Login
1. Login once while online to cache credentials
2. When offline, the app will use cached tokens
3. If no cached data exists, user must connect to internet

### Remember Me
1. Check "Remember me for 7 days" during login
2. Credentials will be saved for automatic login
3. Uncheck to clear saved credentials

## File Structure

```
mobile/
├── constants/
│   └── api.ts              # API configuration and types
├── services/
│   └── api.ts              # API service and storage utilities
├── hooks/
│   └── useAuth.tsx         # Authentication hook
└── app/(auth)/
    └── login.tsx           # Updated login screen
```

## Key Components

### API Service (`services/api.ts`)
- Axios instance with interceptors
- Authentication API methods
- Storage service for offline functionality
- Token refresh logic

### Auth Hook (`hooks/useAuth.tsx`)
- Centralized authentication state management
- Login/logout functions
- Offline login support
- Token refresh handling

### Login Screen (`app/(auth)/login.tsx`)
- Updated to use real API
- Integrated with auth hook
- Offline mode support
- Remember me functionality

## Backend Requirements

The Django backend must have:
1. JWT authentication configured
2. Login endpoint at `/auth/login/`
3. Token refresh endpoint at `/auth/token/refresh/`
4. Password reset endpoint at `/auth/collector-password-reset-request/`

## Testing

1. Start the Django backend server
2. Ensure the API base URL is correct in `constants/api.ts`
3. Test login with provided credentials
4. Test offline functionality by disconnecting internet
5. Test remember me functionality
6. Test password reset request

## Error Handling

The system handles various error scenarios:
- Network connectivity issues
- Invalid credentials
- Account lockouts
- Token expiration
- Server errors

All errors are displayed to the user with appropriate messages and recovery options.

## Security Notes

- Credentials are stored securely using AsyncStorage
- JWT tokens are automatically refreshed
- Failed login attempts are tracked and limited
- All sensitive data is cleared on logout
- Offline mode only works with previously cached valid tokens
