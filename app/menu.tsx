// S3 · Меню: панель справа поверх затемнённого экрана. Гостю — урезанное меню с кнопкой входа (Q10).
import { BlurView } from 'expo-blur';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Avatar,
  Button,
  IconButton,
  MenuGroup,
  MenuItem,
  StatusChip,
} from '@/components';
import { getHomeSummary, getSettings, initials } from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { useSession } from '@/hooks/useSession';
import { colors, fonts, radius, shadows, space, typography, ui } from '@/theme/tokens';

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useSession();
  const userId = user?.id ?? null;

  const info = useQuery(async () => {
    const [settings, summary] = await Promise.all([
      getSettings(),
      userId !== null ? getHomeSummary(userId) : Promise.resolve(null),
    ]);
    return { settings, overdue: summary?.overdueCount ?? 0 };
  }, [userId]);

  const close = () => router.back();
  const go = (href: Href) => router.dismissTo(href);
  const overdue = info.data?.overdue ?? 0;
  const settings = info.data?.settings;

  return (
    <View style={styles.root}>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Закрыть меню" style={StyleSheet.absoluteFill}>
        <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: ui.overlayMenu }]} />
      </Pressable>

      <View
        accessibilityViewIsModal
        accessibilityLabel="Меню"
        style={[styles.panel, { top: space[2] + insets.top, bottom: space[2] + insets.bottom }]}
      >
        <View style={[styles.top, !user && styles.topGuest]}>
          {user && (
            <Pressable onPress={() => go('/profile')} accessibilityRole="link" style={styles.profile}>
              <Avatar initials={initials(user.fullName)} color={user.avatarColor} size={48} />
              <View>
                <Text style={styles.name}>{user.fullName}</Text>
                {user.groupName ? (
                  <AppText variant="caption" tone="secondary">
                    {user.groupName}
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          )}
          <IconButton icon="close" accessibilityLabel="Закрыть меню" variant="plain" size={48} onPress={close} style={styles.closeBtn} />
        </View>

        <MenuGroup>
          <MenuItem icon="search" label="Поиск книг" current onPress={() => go('/search')} />
          <MenuItem
            icon="bookmark"
            label="Мои брони"
            onPress={() => go('/bookings')}
            trailing={
              overdue > 0 ? <StatusChip label={`${overdue} просрочено`} tone="overdue" size="sm" /> : undefined
            }
          />
          {user && <MenuItem icon="user" label="Профиль" onPress={() => go('/profile')} />}
        </MenuGroup>

        <MenuGroup>
          {/* Экранов для этих пунктов в макетах нет — пункты неактивны (Q8). */}
          <MenuItem icon="bookOpen" label="Правила бронирования" disabled />
          <MenuItem
            icon="clock"
            label="Часы работы и адрес"
            caption={settings ? `${settings.location} · ${settings.hours}` : undefined}
            disabled
          />
          <MenuItem icon="message" label="Написать в библиотеку" disabled />
        </MenuGroup>

        <View style={styles.bottom}>
          {user ? (
            <Button
              label="Выйти"
              variant="secondary"
              icon="logout"
              block
              onPress={async () => {
                await logout();
                router.dismissTo('/search');
                router.push('/login');
              }}
            />
          ) : (
            <Button
              label="Войти"
              variant="dark"
              block
              onPress={() => {
                router.dismissTo('/search');
                router.push('/login');
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panel: {
    position: 'absolute',
    right: space[2],
    width: 318,
    maxWidth: '92%',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.sheet,
    backgroundColor: ui.menuPanel,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.menu,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topGuest: { justifyContent: 'flex-end' },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[1],
    paddingLeft: space[1],
    paddingRight: space[3],
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  name: { ...typography.body, lineHeight: 20, fontFamily: fonts.semibold, color: colors.ink },
  closeBtn: { borderRadius: 16 },
  bottom: { marginTop: 'auto', gap: space[3] },
});
