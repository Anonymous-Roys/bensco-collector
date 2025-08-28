// utils/navigationBar.ts
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

export const hideNavigationBar = async () => {
  if (Platform.OS === 'android') {
    try {
      // Hide the navigation bar
      await NavigationBar.setVisibilityAsync('hidden');
      
      // Optional: Set behavior when user swipes up
      await NavigationBar.setBehaviorAsync('overlay-swipe');
      
      // Optional: Set background color to match your app
      await NavigationBar.setBackgroundColorAsync('#000000');
    } catch (error) {
      console.log('Navigation bar control not supported on this device');
    }
  }
};

export const showNavigationBar = async () => {
  if (Platform.OS === 'android') {
    try {
      await NavigationBar.setVisibilityAsync('visible');
    } catch (error) {
      console.log('Navigation bar control not supported on this device');
    }
  }
};

// Alternative: Make it translucent instead of hidden
export const makeNavigationBarTranslucent = async () => {
  if (Platform.OS === 'android') {
    try {
      await NavigationBar.setBackgroundColorAsync('#00000080'); // Semi-transparent
      await NavigationBar.setBehaviorAsync('overlay-swipe');
    } catch (error) {
      console.log('Navigation bar control not supported on this device');
    }
  }
};