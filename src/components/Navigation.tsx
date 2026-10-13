import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  backgrounds,
  colors,
  fonts,
  iconSize,
  radius,
  shadows,
  size as sizes,
  space,
  status,
  typography,
  ui,
} from '@/theme/tokens';

import { AppText } from './AppText';
import { IconButton } from './Button';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';

/** Стеклянная таблетка со знаком и названием. */
export function BrandBadge({
  onPress,
  onLongPress,
  desktop,
}: {
  onPress?: () => void;
  /** Только в dev-сборке: открыть меню отладки. */
  onLongPress?: () => void;
  desktop?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityLabel="Библиотека кампуса"
      style={[styles.badge, desktop && styles.badgeDesktop]}
    >
      <Logo size={desktop ? 40 : 44} />
      <Text style={[styles.badgeText, desktop && styles.badgeTextDesktop]}>Библиотека кампуса</Text>
    </Pressable>
  );
}

type HeaderProps =
  | {
      variant: 'brand';
      onBrandPress?: () => void;
      onBrandLongPress?: () => void;
      action: { icon: 'menu' | 'close'; label: string; onPress: () => void };
    }
  | { variant: 'back'; title: string; backLabel: string; onBack: () => void }
  | { variant: 'book'; backLabel: string; onBack: () => void }
  | { variant: 'success'; badge: string; closeLabel: string; onClose: () => void };

/** Шапка мобильного экрана. */
export function Header(props: HeaderProps) {
  switch (props.variant) {
    case 'brand':
      return (
        <View style={[styles.header, styles.between]}>
          <BrandBadge onPress={props.onBrandPress} onLongPress={props.onBrandLongPress} />
          <IconButton
            icon={props.action.icon}
            accessibilityLabel={props.action.label}
            onPress={props.action.onPress}
            color={props.action.icon === 'menu' ? status.neutral.fg : colors.ink}
          />
        </View>
      );
    case 'back':
      return (
        <View style={[styles.header, styles.gap]}>
          <IconButton icon="back" accessibilityLabel={props.backLabel} onPress={props.onBack} />
          <AppText variant="headline" style={styles.semibold} accessibilityRole="header">
            {props.title}
          </AppText>
        </View>
      );
    case 'book':
      return (
        <View style={[styles.header, styles.between]}>
          <IconButton icon="back" accessibilityLabel={props.backLabel} onPress={props.onBack} />
          <Logo size={sizes.iconButton} square />
        </View>
      );
    case 'success':
      return (
        <View style={[styles.header, styles.gap]}>
          <View style={styles.success} accessibilityRole="image" accessibilityLabel={props.badge}>
            <View style={styles.successCheck}>
              <Icon name="check" size={iconSize.button} color={colors.onDark} />
            </View>
            <Text style={styles.successText}>{props.badge}</Text>
          </View>
          <IconButton icon="close" accessibilityLabel={props.closeLabel} onPress={props.onClose} />
        </View>
      );
  }
}

export type TabItem = {
  key: string;
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
};

/** Плавающая навигация студента: Поиск · Мои брони (бейдж активных) · Профиль. */
export function TabBar({ tabs, bottom = 20 }: { tabs: TabItem[]; bottom?: number }) {
  return (
    <View accessibilityRole="tablist" style={[styles.tabbar, { bottom }]}>
      {tabs.map((t) => (
        <Pressable
          key={t.key}
          onPress={t.onPress}
          accessibilityRole="tab"
          accessibilityLabel={t.badge ? `${t.label}, ${t.badge} активные` : t.label}
          accessibilityState={{ selected: t.active }}
          style={[styles.tab, t.active && styles.tabActive]}
        >
          <Icon name={t.icon} size={iconSize.tabBar} color={t.active ? colors.ink : colors.inkSubtle} strokeWidth={t.icon === 'search' ? 1.9 : 1.75} />
          {t.badge ? (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{t.badge}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

/** Пункт меню: иконка, текст, справа чип или подпись под текстом. */
export function MenuItem({
  icon,
  label,
  caption,
  current,
  trailing,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  caption?: string;
  current?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={disabled ? 'text' : 'link'}
      accessibilityState={{ selected: !!current, disabled: !!disabled }}
      style={[styles.menuItem, caption ? styles.menuItemTall : null, current && styles.menuItemCurrent]}
    >
      <Icon name={icon} size={iconSize.button} color={colors.ink} />
      <View style={styles.flex}>
        <Text style={[styles.menuText, current && styles.semibold]}>{label}</Text>
        {caption ? <AppText variant="caption" tone="secondary">{caption}</AppText> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

export function MenuGroup({ children }: { children: ReactNode }) {
  return <View style={styles.menuGroup}>{children}</View>;
}

export type ModeratorSection = 'journal' | 'issue' | 'catalog';

const SECTIONS: { key: ModeratorSection; label: string }[] = [
  { key: 'journal', label: 'Журнал' },
  { key: 'issue', label: 'Выдача и сверка' },
  { key: 'catalog', label: 'Каталог' },
];

/** Шапка модератора: бейдж, вкладки разделов, дата, модератор, «Выйти». */
export function ModeratorTopBar({
  current,
  onNavigate,
  date,
  moderatorName,
  moderatorInitials,
  onLogout,
  showDate = true,
}: {
  current: ModeratorSection;
  onNavigate: (s: ModeratorSection) => void;
  date: string;
  moderatorName: string;
  moderatorInitials: string;
  onLogout: () => void;
  showDate?: boolean;
}) {
  return (
    <View style={styles.modBar}>
      <View style={styles.modLeft}>
        <BrandBadge desktop onPress={() => onNavigate('journal')} />
        <View accessibilityRole="tablist" accessibilityLabel="Разделы модератора" style={styles.modTabs}>
          {SECTIONS.map((s) => {
            const on = s.key === current;
            return (
              <Pressable
                key={s.key}
                onPress={() => onNavigate(s.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.modTab, on && styles.modTabOn]}
              >
                <Text style={[typography.buttonSm, { color: on ? colors.ink : colors.inkSecondary }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.modRight}>
        {showDate && (
          <View style={styles.datePill}>
            <AppText variant="label" tone="neutral" style={styles.regular}>
              {date}
            </AppText>
          </View>
        )}
        <View style={[styles.badge, styles.modUser]}>
          <View style={styles.modAvatar}>
            <Text style={styles.modAvatarText}>{moderatorInitials}</Text>
          </View>
          <AppText variant="label" style={styles.regular}>
            {moderatorName}
          </AppText>
        </View>
        <IconButton icon="logout" accessibilityLabel="Выйти" onPress={onLogout} />
      </View>
    </View>
  );
}

/** Шаги импорта: пройденный — зелёный с галочкой, текущий — тёмный. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View accessibilityLabel="Шаги импорта" style={styles.steps}>
      {steps.map((label, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <View
            key={label}
            accessibilityState={{ selected: on }}
            style={[styles.step, { backgroundColor: on ? colors.ink : ui.chipLgBg }]}
          >
            <View style={[styles.stepNum, { backgroundColor: on ? ui.onDarkTrack : done ? status.available.bg : status.neutral.bg }]}>
              {done ? (
                <Icon name="check" size={14} color={status.available.fg} strokeWidth={2.6} />
              ) : (
                <Text style={[styles.stepNumText, { color: on ? colors.onDark : status.neutral.fg }]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepText, { color: on ? colors.onDark : done ? status.available.fg : colors.inkSecondary }]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  regular: { fontFamily: fonts.regular },
  header: { flexDirection: 'row', alignItems: 'center', height: sizes.controlLg },
  between: { justifyContent: 'space-between' },
  gap: { gap: space[3] },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[3],
    height: sizes.controlLg,
    paddingLeft: 6,
    paddingRight: space[5],
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.glass,
  },
  badgeDesktop: { height: sizes.iconButton },
  badgeText: { ...typography.body, lineHeight: 20, fontFamily: fonts.medium, color: colors.ink },
  badgeTextDesktop: { fontSize: 14 },
  success: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: sizes.iconButton,
    paddingLeft: 6,
    paddingRight: space[4],
    borderRadius: radius.pill,
    backgroundColor: status.available.bg,
    experimental_backgroundImage: backgrounds.successBadge,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.glass,
  },
  successCheck: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: status.available.dot,
    experimental_backgroundImage: backgrounds.successCheck,
  },
  successText: { ...typography.body, lineHeight: 20, fontFamily: fonts.medium, color: status.available.fg },

  tabbar: {
    position: 'absolute',
    left: space[6],
    right: space[6],
    height: sizes.tabBar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: space[2],
    borderRadius: radius['2xl'],
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.floating,
  },
  tab: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.surface, boxShadow: shadows.tabActive },
  tabBadge: {
    position: 'absolute',
    top: space[2],
    right: space[2],
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 18, color: colors.onDark },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: 52,
    paddingHorizontal: space[3],
    borderRadius: radius.icon,
  },
  menuItemTall: { height: undefined, minHeight: 60, paddingVertical: space[2] },
  menuItemCurrent: { backgroundColor: colors.surfaceSunken },
  menuText: { ...typography.body, lineHeight: 20, fontFamily: fonts.medium, color: colors.ink },
  menuGroup: { padding: 6, borderRadius: radius.xl, backgroundColor: colors.surface },

  modBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  modLeft: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[3] },
  modTabs: {
    flexDirection: 'row',
    gap: space[1],
    padding: space[1],
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.glass,
  },
  modTab: { height: 42, justifyContent: 'center', paddingHorizontal: 18, borderRadius: radius.pill },
  modTabOn: { backgroundColor: colors.surface, boxShadow: shadows.tabActive },
  modRight: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  datePill: {
    height: sizes.iconButton,
    justifyContent: 'center',
    paddingHorizontal: space[5],
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassEdge,
  },
  modUser: { height: sizes.iconButton, gap: 10, paddingRight: 18 },
  modAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.disabledBg,
  },
  modAvatarText: { fontFamily: fonts.semibold, fontSize: 12, color: status.neutral.fg },

  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: sizes.chipLg,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: radius.pill,
  },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: fonts.semibold, fontSize: 12 },
  stepText: { ...typography.caption, fontFamily: fonts.medium },
});
