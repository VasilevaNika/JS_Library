// Меню отладки (только dev): переключатели состояний, которые в локальном режиме не возникают сами
// (spec.md, Q7), сброс базы к тестовым данным. Открывается долгим нажатием на бейдж «Библиотека кампуса».
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Header, MenuGroup, MenuItem, ScreenBackground, Switch } from '@/components';
import { getDevFlag, login, resetDatabase, setDevFlag, type DevFlag } from '@/db';
import { TEST_PASSWORD } from '@/mocks/seed';
import { useSession } from '@/hooks/useSession';
import { space } from '@/theme/tokens';

const FLAGS: { flag: DevFlag; label: string }[] = [
  { flag: 'offline', label: 'Нет подключения (результаты поиска)' },
  { flag: 'race', label: 'Книгу только что забронировали' },
  { flag: 'bookingError', label: 'Ошибка при создании брони' },
  { flag: 'sessionExpired', label: 'Сессия истекла' },
  { flag: 'loadError', label: 'Ошибка загрузки данных' },
];

export default function DevMenu() {
  const router = useRouter();
  const { refresh, logout } = useSession();

  const signIn = async (email: string, home: '/search' | '/moderator/journal') => {
    await login(email, TEST_PASSWORD);
    await refresh();
    router.replace(home);
  };
  const [values, setValues] = useState<Partial<Record<DevFlag, boolean>>>({});

  useEffect(() => {
    void Promise.all(FLAGS.map(async (f) => [f.flag, await getDevFlag(f.flag)] as const)).then((pairs) =>
      setValues(Object.fromEntries(pairs)),
    );
  }, []);

  const toggle = async (flag: DevFlag, on: boolean) => {
    await setDevFlag(flag, on);
    setValues((v) => ({ ...v, [flag]: on }));
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header variant="back" title="Отладка" backLabel="Назад" onBack={() => router.back()} />
          <MenuGroup>
            {FLAGS.map((f) => (
              <View key={f.flag} style={styles.row}>
                <AppText variant="label" style={styles.flex}>
                  {f.label}
                </AppText>
                <Switch value={!!values[f.flag]} onChange={(v) => void toggle(f.flag, v)} label={f.label} />
              </View>
            ))}
          </MenuGroup>
          <MenuGroup>
            <MenuItem icon="user" label="Войти как студент (Анна Смирнова)" onPress={() => void signIn('anna.smirnova@mail.ru', '/search')} />
            <MenuItem icon="user" label="Войти как модератор" onPress={() => void signIn('moderator@campus.test', '/moderator/journal')} />
            <MenuItem icon="logout" label="Выйти" onPress={() => void logout()} />
            <MenuItem icon="bookOpen" label="Демо компонентов" onPress={() => router.push('/dev/components')} />
          </MenuGroup>
          <Button
            label="Сбросить базу к тестовым данным"
            variant="danger"
            block
            onPress={async () => {
              await resetDatabase();
              await refresh();
              router.replace('/search');
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space[4], gap: space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], paddingHorizontal: space[3] },
});
