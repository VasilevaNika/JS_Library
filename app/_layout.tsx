import {
  GolosText_400Regular,
  GolosText_500Medium,
  GolosText_600SemiBold,
  useFonts,
} from '@expo-google-fonts/golos-text';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { PhoneColumn } from '@/components';
import { SessionProvider } from '@/hooks/useSession';
import { backgrounds, colors, fonts } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    [fonts.regular]: GolosText_400Regular,
    [fonts.medium]: GolosText_500Medium,
    [fonts.semibold]: GolosText_600SemiBold,
  });

  const pathname = usePathname();
  // В браузере студент — колонкой шириной телефона, модератор — во всю ширину, как в макетах 1440×900.
  const phone = Platform.OS === 'web' && !pathname.startsWith('/moderator');

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SessionProvider>
      {/* Дерево одинаковое в обоих режимах — меняются только стили, иначе навигация пересоздавалась бы. */}
      <View style={[styles.page, phone && styles.pageWide]}>
        <PhoneColumn enabled={phone}>
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
            <Stack.Screen name="dev/components" />
            <Stack.Screen name="dev/index" />
          </Stack>
        </PhoneColumn>
      </View>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.groundMid },
  // Поле вокруг колонки — фон десктопных макетов.
  pageWide: { experimental_backgroundImage: backgrounds.desktop },
});
