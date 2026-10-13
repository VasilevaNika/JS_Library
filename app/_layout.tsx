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

  return <Stack screenOptions={{ headerShown: false }} />;
}
