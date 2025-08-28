import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  User, 
  Lock, 
  Wifi, 
  WifiOff, 
  Phone, 
  Mail, 
  Shield,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimer, setBlockTimer] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [showAlert, setShowAlert] = useState(null);

  // Simulate network status
  useEffect(() => {
    const checkConnection = () => {
      setIsOffline(Math.random() > 0.8); // Simulate occasional offline
    };
    
    const interval = setInterval(checkConnection, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle login attempt blocking
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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const showCustomAlert = (type, title, message, onClose) => {
    setShowAlert({ type, title, message, onClose });
  };

  const handleLogin = async () => {
    if (isBlocked) {
      showCustomAlert(
        'error',
        'Account Temporarily Locked',
        `Please wait ${blockTimer} seconds before trying again.`,
        () => setShowAlert(null)
      );
      return;
    }

    if (!email.trim() || !password.trim()) {
      showCustomAlert(
        'error',
        'Missing Information',
        'Please enter both email and password.',
        () => setShowAlert(null)
      );
      return;
    }

    if (!validateEmail(email)) {
      showCustomAlert(
        'error',
        'Invalid Email',
        'Please enter a valid email address.',
        () => setShowAlert(null)
      );
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate login failure for demo (remove in production)
      if (email !== "worker@bensco.com" || password !== "password123") {
        throw new Error("Invalid credentials");
      }

      // Success - in real app, store JWT token securely
      showCustomAlert(
        'success',
        'Login Successful',
        'Welcome to BENSCO SUSU! Redirecting to dashboard...',
        () => {
          setShowAlert(null);
          console.log("Navigate to main app");
        }
      );
      
      setLoginAttempts(0);
      
    } catch (error) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        setIsBlocked(true);
        setBlockTimer(300); // 5 minutes block
        showCustomAlert(
          'error',
          'Account Locked',
          'Too many failed attempts. Your account has been temporarily locked for 5 minutes.',
          () => setShowAlert(null)
        );
      } else {
        showCustomAlert(
          'error',
          'Login Failed',
          `Invalid credentials. ${5 - newAttempts} attempts remaining.`,
          () => setShowAlert(null)
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineLogin = () => {
    showCustomAlert(
      'warning',
      'Offline Login',
      'You\'re currently offline. Using cached credentials to log you in.',
      () => {
        setShowAlert(null);
        console.log("Offline login");
      }
    );
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const submitPasswordReset = () => {
    if (!resetEmail.trim() && !resetPhone.trim()) {
      showCustomAlert(
        'error',
        'Missing Information',
        'Please enter either your email or phone number.',
        () => setShowAlert(null)
      );
      return;
    }

    showCustomAlert(
      'success',
      'Reset Request Sent',
      'Your password reset request has been sent to the admin via SMS. You will receive new login credentials within 24 hours.',
      () => {
        setShowAlert(null);
        setShowForgotPassword(false);
        setResetEmail('');
        setResetPhone('');
      }
    );
  };

  const CustomAlert = ({ type, title, message, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-center mb-4">
          {type === 'success' && <CheckCircle className="text-green-500 mr-3" size={24} />}
          {type === 'error' && <AlertCircle className="text-red-500 mr-3" size={24} />}
          {type === 'warning' && <AlertCircle className="text-yellow-500 mr-3" size={24} />}
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );

  const ForgotPasswordModal = () => (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center mb-4">
          <Shield className="text-red-600 mr-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-800">Password Reset Request</h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          Enter your email or phone number. The admin will send you new login credentials via SMS.
        </p>
        
        <div className="relative mb-4">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="email"
            placeholder="Email address"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        
        <div className="text-center text-gray-500 font-medium mb-4">OR</div>
        
        <div className="relative mb-6">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="tel"
            placeholder="Phone number"
            value={resetPhone}
            onChange={(e) => setResetPhone(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowForgotPassword(false)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors border border-gray-300"
          >
            Cancel
          </button>
          
          <button
            onClick={submitPasswordReset}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Connection Status Bar */}
      <div className={`flex items-center justify-center py-2 px-4 ${isOffline ? 'bg-yellow-500' : 'bg-green-500'}`}>
        {isOffline ? <WifiOff className="text-white mr-2" size={16} /> : <Wifi className="text-white mr-2" size={16} />}
        <span className="text-white text-sm font-medium">
          {isOffline ? 'Offline Mode' : 'Connected'}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <h1 className="text-4xl font-bold text-red-600 tracking-wider">BENSCO</h1>
              <p className="text-sm text-blue-800 font-semibold mt-1">SUSU LIMITED</p>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Field Worker Login</h2>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {/* Email Input */}
            <div className="relative mb-4">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isBlocked}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            {/* Password Input */}
            <div className="relative mb-4">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isBlocked}
                className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Remember Me */}
            <div className="flex items-center mb-6">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                  rememberMe 
                    ? 'bg-red-600 border-red-600' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {rememberMe && <span className="text-white text-xs font-bold">✓</span>}
              </button>
              <span className="text-sm text-gray-600">Remember me for 7 days</span>
            </div>

            {/* Login Attempts Warning */}
            {loginAttempts > 0 && !isBlocked && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center">
                  <AlertCircle className="mr-2" size={16} />
                  <span className="text-sm font-medium">
                    {5 - loginAttempts} attempts remaining
                  </span>
                </div>
              </div>
            )}

            {/* Block Timer */}
            {isBlocked && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center">
                  <Clock className="mr-2" size={16} />
                  <span className="text-sm font-medium">
                    Account locked for {Math.floor(blockTimer / 60)}:{(blockTimer % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}

            {/* Login Button */}
            <button
              onClick={isOffline ? handleOfflineLogin : handleLogin}
              disabled={isLoading || isBlocked}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 ${
                (isLoading || isBlocked)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-md hover:shadow-lg'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Logging in...
                </div>
              ) : (
                isOffline ? 'Login Offline' : 'Login'
              )}
            </button>

            {/* Forgot Password */}
            <button
              onClick={handleForgotPassword}
              className="w-full mt-4 py-3 text-blue-800 hover:text-blue-900 font-medium transition-colors"
            >
              Forgot Password? Request Reset
            </button>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">Demo Credentials:</p>
              <p className="text-xs text-gray-600 font-mono">Email: worker@bensco.com</p>
              <p className="text-xs text-gray-600 font-mono">Password: password123</p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Your data is protected with enterprise-grade security
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showForgotPassword && <ForgotPasswordModal />}
      {showAlert && (
        <CustomAlert 
          type={showAlert.type}
          title={showAlert.title}
          message={showAlert.message}
          onClose={showAlert.onClose}
        />
      )}
    </div>
  );
};

export default LoginScreen;