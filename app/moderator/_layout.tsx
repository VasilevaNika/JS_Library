// Раздел модератора: макеты 1440×900, альбомная раскладка «как на ноутбуке» (Q1).
// Общая шапка «Журнал · Выдача и сверка · Каталог» — здесь, экраны рендерятся под ней.
import * as ScreenOrientation from 'expo-screen-orientation';
import { Redirect, Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModeratorTopBar, ScreenBackground, type ModeratorSection } from '@/components';
import { initials } from '@/db';
import { useSession } from '@/hooks/useSession';
import { weekdayDayMonth } from '@/lib/format';
import { space, ui } from '@/theme/tokens';

export default function ModeratorLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useSession();
  // Дата в шапке — на момент открытия раздела.
  const [today] = useState(() => weekdayDayMonth(Date.now()));

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  if (user === undefined) return null;
  if (!user || user.role !== 'moderator') return <Redirect href="/login" />;

  const current: ModeratorSection = pathname.includes('/issue')
    ? 'issue'
    : pathname.includes('/catalog')
      ? 'catalog'
      : 'journal';
  // На импорте и форме книги в макетах нет даты в шапке.
  const showDate = !pathname.includes('/import') && !pathname.includes('/catalog/book');

  return (
    <ScreenBackground variant="desktop">
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.bar}>
          <ModeratorTopBar
            current={current}
            showDate={showDate}
            onNavigate={(s) =>
              router.replace(s === 'journal' ? '/moderator/journal' : s === 'issue' ? '/moderator/issue' : '/moderator/catalog')
            }
            date={today}
            moderatorName={user.fullName}
            moderatorInitials={initials(user.fullName)}
            onLogout={async () => {
              await logout();
              router.dismissAll();
              router.replace('/login');
            }}
          />
        </View>
        <View style={styles.flex}>
          <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: styles.transparent }}>
            <Stack.Screen name="journal" />
            <Stack.Screen name="issue" />
            <Stack.Screen name="catalog/index" />
            <Stack.Screen name="catalog/import" />
            <Stack.Screen name="catalog/book" />
          </Stack>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { paddingTop: space[4], paddingHorizontal: space[6], paddingBottom: space[4] },
  transparent: { backgroundColor: ui.transparent },
});
