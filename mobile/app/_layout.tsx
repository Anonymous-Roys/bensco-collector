import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { Provider } from 'react-redux';

import { useColorScheme } from '@/hooks/useColorScheme';
import { store } from '@/store';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    const setupNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          await NavigationBar.setBackgroundColorAsync(
            colorScheme === 'dark' ? '#000000' : '#ffffff'
          );
        } catch {
          console.log('Navigation bar control not available on this device');
        }
      }
    };

    setupNavigationBar();
  }, [colorScheme]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* ✅ Login screen registered here */}
          <Stack.Screen 
  name="(auth)/login" 
  options={{ 
    headerShown: false,
    gestureEnabled: false // Prevent swipe back from login
  }} 
/>
          
          {/* ✅ Tabs layout (after login) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          
          {/* 404 fallback screen */}
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </Provider>
  );
}
