// S10 · Профиль. Состояние одно (норма); загрузка и гость — минимальные (Q6).
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Avatar,
  Button,
  EmptyState,
  Glass,
  Header,
  IconButton,
  InfoList,
  ScreenBackground,
  StatusChip,
  StatusIcon,
  TwoToneTitle,
} from '@/components';
import { getSettings, initials, setTelegramEnabled } from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { useSession } from '@/hooks/useSession';
import { colors, fonts, radius, space, typography, ui } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refresh, logout } = useSession();
  const settings = useQuery(() => getSettings(), []);

  const header = (
    <Header
      variant="brand"
      onBrandPress={() => router.navigate('/search')}
      action={{ icon: 'menu', label: 'Меню', onPress: () => router.push('/menu') }}
    />
  );

  if (!user) {
    return (
      <ScreenBackground variant="profile">
        <SafeAreaView edges={['top']} style={styles.flex}>
          <View style={styles.content}>
            {header}
            <TwoToneTitle text="Мой" muted="профиль" style={styles.title} />
            <EmptyState
              visual={<StatusIcon icon="user" tone="white" />}
              title="Вход в библиотеку"
              text="Войдите, чтобы бронировать книги и следить за сроками."
              actions={<Button label="Войти" variant="dark" block onPress={() => router.push('/login')} />}
            />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const s = settings.data;
  const subtitle = [user.groupName, user.telegram ? `@${user.telegram}` : null].filter(Boolean).join(' · ');

  const toggleTelegram = async (on: boolean) => {
    await setTelegramEnabled(user.id, on);
    await refresh();
  };

  return (
    <ScreenBackground variant="profile">
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          {header}
          <TwoToneTitle text="Мой" muted="профиль" style={styles.title} />

          <Glass style={styles.reader}>
            <View style={styles.avatar}>
              <Avatar initials={initials(user.fullName)} color={user.avatarColor} size={64} />
            </View>
            <View style={styles.readerText}>
              <Text style={styles.name}>{user.fullName}</Text>
              {subtitle ? (
                <AppText variant="caption" tone="secondary">
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <IconButton icon="edit" variant="plain" accessibilityLabel="Изменить профиль" onPress={() => router.push('/profile-edit')} />
          </Glass>

          <Glass style={styles.section}>
            <AppText variant="headline" style={styles.indent}>
              Уведомления
            </AppText>
            <View style={styles.notif}>
              <View style={[styles.notifRow, styles.notifDivider]}>
                <View style={styles.notifText}>
                  <AppText variant="label">Почта · {user.email}</AppText>
                  <AppText variant="caption" tone="secondary">
                    Всегда включена — сюда приходят все сроки
                  </AppText>
                </View>
                <StatusChip label="Вкл." tone="available" size="sm" />
              </View>
              <View style={styles.notifRow}>
                <View style={styles.notifText}>
                  <AppText variant="label">{user.telegram ? `Telegram · @${user.telegram}` : 'Telegram'}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {!user.telegram
                      ? 'Не подключён — напоминания приходят только на почту'
                      : user.telegramEnabled
                        ? 'Подключён — напоминания придут и сюда'
                        : 'Отключён — напоминания приходят только на почту'}
                  </AppText>
                </View>
                {!user.telegram ? (
                  <Button label="Подключить" variant="tertiary" size="md" onPress={() => router.push('/profile-edit')} />
                ) : user.telegramEnabled ? (
                  <Button label="Отключить" variant="tertiary" size="md" onPress={() => void toggleTelegram(false)} />
                ) : (
                  <Button label="Включить" variant="tertiary" size="md" onPress={() => void toggleTelegram(true)} />
                )}
              </View>
            </View>
          </Glass>

          <InfoList
            items={[
              { label: 'Читательский билет', value: `№ ${user.ticketNumber ?? '—'}`, minHeight: 48, tabular: true },
              { label: 'Абонемент', value: s ? `${s.locationShort} · ${s.hours}` : '', minHeight: 48 },
              // Экрана правил в макетах нет — ссылка неактивна (Q8), шеврон оставлен как в макете.
              { label: 'Правила бронирования', value: s ? `${s.pickupHours} ч на получение` : '', chevron: true, minHeight: 48 },
            ]}
          />

          <Button
            label="Выйти"
            variant="secondary"
            block
            onPress={async () => {
              await logout();
              router.navigate('/search');
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space[4], paddingBottom: 120, gap: space[4] },
  title: { marginHorizontal: space[2] },
  reader: { flexDirection: 'row', alignItems: 'center', gap: space[4], padding: space[4] },
  avatar: { borderRadius: 32, boxShadow: ui.logoHighlight },
  readerText: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...typography.headline, fontFamily: fonts.semibold, color: colors.ink },
  section: { gap: space[3], paddingTop: space[4], paddingHorizontal: space[3], paddingBottom: space[3] },
  indent: { paddingHorizontal: space[2] },
  notif: { paddingHorizontal: space[4], paddingVertical: space[1], borderRadius: radius.xl, backgroundColor: colors.surface },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], minHeight: 64 },
  notifDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  notifText: { flex: 1, minWidth: 0, gap: 2 },
});
