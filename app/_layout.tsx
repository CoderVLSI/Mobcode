import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import * as AppRegistry from 'expo-modules-core';
import { AppState, AppStateStatus } from 'react-native';

function LayoutContent() {
  const { isDarkMode } = useTheme();

  // Handle app state changes to keep tasks running in background
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('App going to background, keeping tasks running...');
        // Tasks will continue running even when app is in background
      } else if (nextAppState === 'active') {
        console.log('App coming to foreground');
        // App is active again
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LayoutContent />
    </ThemeProvider>
  );
}
