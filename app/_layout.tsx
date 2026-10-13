import {
  GolosText_400Regular,
  GolosText_500Medium,
  GolosText_600SemiBold,
  useFonts,
} from '@expo-google-fonts/golos-text';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { fonts } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    [fonts.regular]: GolosText_400Regular,
    [fonts.medium]: GolosText_500Medium,
    [fonts.semibold]: GolosText_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="book/[id]" />
      <Stack.Screen name="booking/[id]" />
      <Stack.Screen name="booking-confirmed/[id]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="profile-edit" />
      <Stack.Screen name="menu" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="login" options={{ presentation: 'modal' }} />
      <Stack.Screen name="reset-password" options={{ presentation: 'modal' }} />
      <Stack.Screen name="moderator" />
    </Stack>
  );
}
