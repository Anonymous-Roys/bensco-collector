// Logo Color Palette for React Native
// Extracted from the shield logo with "WE CARE FOR YOU" banner

export const LogoColors = {
  // Primary Brand Colors
  primary: {
    red: '#DC143C',           // Main red from left side of shield
    redDark: '#B91C1C',       // Darker red for pressed states
    redLight: '#EF4444',      // Lighter red for hover/active states
  },
  
  // Secondary Colors
  secondary: {
    navy: '#1E3A8A',          // Dark blue from the letter/symbol
    navyDark: '#1E40AF',      // Darker navy for depth
    navyLight: '#3B82F6',     // Lighter navy for highlights
  },
  
  // Neutral Colors
  neutral: {
    white: '#FFFFFF',         // White background of shield
    offWhite: '#F9FAFB',      // Slightly off-white for backgrounds
    cream: '#FEF7ED',         // Warm white/cream tone
  },
  
  // Accent Colors
  accent: {
    gold: '#F59E0B',          // Gold accent (from border highlights)
    goldLight: '#FCD34D',     // Light gold
    goldDark: '#D97706',      // Dark gold
  },
  
  // Text Colors
  text: {
    primary: '#111827',       // Dark text (banner text color)
    secondary: '#6B7280',     // Medium gray text
    light: '#9CA3AF',         // Light gray text
    onPrimary: '#FFFFFF',     // White text on primary colors
    onSecondary: '#FFFFFF',   // White text on secondary colors
  },
  
  // Background Colors
  background: {
    primary: '#FFFFFF',       // Main background
    secondary: '#F9FAFB',     // Secondary background
    tertiary: '#F3F4F6',     // Tertiary background
    surface: '#FFFFFF',       // Card/surface background
  },
  
  // Border Colors
  border: {
    light: '#E5E7EB',         // Light border
    medium: '#D1D5DB',        // Medium border
    dark: '#6B7280',          // Dark border (shield outline)
    primary: '#DC143C',       // Primary colored border
    secondary: '#1E3A8A',     // Secondary colored border
  },
  
  // Status Colors (following the brand theme)
  status: {
    success: '#10B981',       // Green for success
    warning: '#F59E0B',       // Gold/amber for warning
    error: '#DC143C',         // Brand red for errors
    info: '#1E3A8A',          // Brand navy for info
  },
  
  // Gradient Combinations
  gradients: {
    primary: ['#DC143C', '#B91C1C'],           // Red gradient
    secondary: ['#1E3A8A', '#1E40AF'],         // Navy gradient
    accent: ['#F59E0B', '#D97706'],            // Gold gradient
    brand: ['#DC143C', '#1E3A8A'],             // Brand red to navy
    subtle: ['#F9FAFB', '#F3F4F6'],           // Subtle neutral gradient
  },
  
  // Shadow Colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    heavy: 'rgba(0, 0, 0, 0.15)',
    colored: 'rgba(220, 20, 60, 0.2)',        // Brand red shadow
  }
};

// React Native StyleSheet Example Usage
import { StyleSheet } from 'react-native';

export const brandStyles = StyleSheet.create({
  // Primary Button
  primaryButton: {
    backgroundColor: LogoColors.primary.red,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    elevation: 3,
    shadowColor: LogoColors.shadow.colored,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  
  primaryButtonText: {
    color: LogoColors.text.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Secondary Button
  secondaryButton: {
    backgroundColor: LogoColors.secondary.navy,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    elevation: 2,
  },
  
  secondaryButtonText: {
    color: LogoColors.text.onSecondary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Outline Button
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: LogoColors.primary.red,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  
  outlineButtonText: {
    color: LogoColors.primary.red,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Card Style
  card: {
    backgroundColor: LogoColors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: LogoColors.shadow.medium,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  
  // Header Style
  header: {
    backgroundColor: LogoColors.primary.red,
    paddingVertical: 16,
    paddingHorizontal: 20,
    elevation: 4,
  },
  
  headerText: {
    color: LogoColors.text.onPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Input Style
  input: {
    borderWidth: 1,
    borderColor: LogoColors.border.medium,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: LogoColors.background.primary,
    color: LogoColors.text.primary,
  },
  
  inputFocused: {
    borderColor: LogoColors.primary.red,
    borderWidth: 2,
  },
  
  // Badge Styles
  successBadge: {
    backgroundColor: LogoColors.status.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  warningBadge: {
    backgroundColor: LogoColors.status.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  errorBadge: {
    backgroundColor: LogoColors.status.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  badgeText: {
    color: LogoColors.text.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});

// Usage Examples:

// 1. Simple Component Usage
/*
<View style={brandStyles.card}>
  <Text style={{ color: LogoColors.text.primary, fontSize: 18, fontWeight: 'bold' }}>
    We Care For You
  </Text>
  <TouchableOpacity style={brandStyles.primaryButton}>
    <Text style={brandStyles.primaryButtonText}>Get Started</Text>
  </TouchableOpacity>
</View>
*/

// 2. Gradient Background (with react-native-linear-gradient)
/*
import LinearGradient from 'react-native-linear-gradient';

<LinearGradient
  colors={LogoColors.gradients.brand}
  style={{ flex: 1, padding: 20 }}
>
  // Your content here
</LinearGradient>
*/

// 3. Dynamic Color Usage
/*
const getDynamicStyle = (type) => ({
  backgroundColor: type === 'primary' 
    ? LogoColors.primary.red 
    : LogoColors.secondary.navy,
  color: LogoColors.text.onPrimary,
});
*/