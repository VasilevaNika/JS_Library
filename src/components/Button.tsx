import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, iconSize, radius, shadows, size as sizes, status, typography, ui } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';

export type ButtonVariant =
  | 'primary'
  | 'dark'
  | 'secondary'
  | 'tertiary'
  | 'danger'
  /** Белая кнопка на цветной плашке или тёмном тосте («Повторить», «Открыть её»). */
  | 'light'
  /** Сверка: «На полке — закрыть». */
  | 'positive'
  /** Сверка: «Нет на полке». */
  | 'negative';

export type ButtonSize = 'lg' | 'md' | 'sm';

const VARIANT: Record<ButtonVariant, { bg: string; fg: string; border?: string; shadow?: string }> = {
  primary: { bg: colors.accent, fg: colors.onAccent, shadow: shadows.accent },
  dark: { bg: colors.ink, fg: colors.onDark },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
  tertiary: { bg: colors.surfaceSunken, fg: colors.ink },
  danger: { bg: status.overdue.bg, fg: status.overdue.fg },
  light: { bg: colors.surface, fg: colors.ink },
  positive: { bg: status.available.bg, fg: status.available.fg },
  negative: { bg: status.overdue.bg, fg: status.overdue.fg },
};

const SIZE: Record<ButtonSize, { height: number; padding: number; text: TextStyle }> = {
  lg: { height: sizes.controlLg, padding: 24, text: typography.button },
  md: { height: sizes.controlMd, padding: 16, text: typography.buttonSm },
  sm: { height: sizes.controlSm, padding: 14, text: { ...typography.buttonSm, fontSize: 13, lineHeight: 18 } },
};

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Жирность 600 для md (desktop-кнопки «Подтвердить выдачу», «Отметить расхождение»). */
  strong?: boolean;
  /** Своя высота (кнопки 36 px в тостах и плашках). */
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'dark',
  size = 'lg',
  icon,
  block,
  disabled,
  loading,
  strong,
  height,
  style,
  accessibilityLabel,
}: Props) {
  const v = VARIANT[variant];
  const s = SIZE[size];
  const isDanger = variant === 'danger' || variant === 'negative';
  const off = disabled && !loading;
  const bg = off ? (isDanger ? ui.dangerDisabledBg : ui.disabledBg) : v.bg;
  const fg = off ? (isDanger ? ui.dangerDisabledFg : ui.disabledFg) : v.fg;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: height ?? s.height,
          paddingHorizontal: s.padding,
          backgroundColor: bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border && !off ? 1 : 0,
          boxShadow: v.shadow && !off ? v.shadow : undefined,
        },
        block && styles.block,
        loading && styles.loading,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? <Spinner color={fg} /> : icon ? <Icon name={icon} size={iconSize.button} color={fg} /> : null}
      <Text style={[s.text, { color: fg }, strong && { fontFamily: typography.button.fontFamily }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Spinner({ color = colors.ink, size = iconSize.button }: { color?: string; size?: number }) {
  const [turn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Icon name="spinner" size={size} color={color} />
    </Animated.View>
  );
}

type IconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  /** glass 52 — шапка мобильного экрана, plain 44 — белая в тулбаре, accent — кнопка с лого. */
  variant?: 'glass' | 'plain';
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'glass',
  color = colors.ink,
  size,
  style,
  children,
}: IconButtonProps) {
  const glass = variant === 'glass';
  const box = size ?? (glass ? sizes.iconButton : sizes.controlMd);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: box, height: box },
        glass ? styles.iconGlass : styles.iconPlain,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon name={icon} size={glass ? iconSize.iconButton : iconSize.button} color={color} />
      {children}
    </Pressable>
  );
}

/** Подчёркнутая ссылка внутри текста и плашек. */
export function TextLink({
  label,
  onPress,
  size = 13,
  color = colors.ink,
}: {
  label: string;
  onPress?: () => void;
  size?: 13 | 14;
  color?: string;
}) {
  return (
    <Text
      onPress={onPress}
      accessibilityRole="link"
      style={[
        size === 13 ? typography.caption : typography.label,
        styles.link,
        { color },
      ]}
    >
      {label}
    </Text>
  );
}

/** Неинтерактивная обёртка-ряд для пары кнопок с пропорциями из макета. */
export function ButtonRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    borderRadius: radius.pill,
  },
  block: { alignSelf: 'stretch' },
  loading: { opacity: 0.7 },
  pressed: { opacity: 0.85 },
  iconBtn: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconGlass: {
    borderRadius: radius.icon,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.glass,
  },
  iconPlain: { borderRadius: 16, backgroundColor: colors.surface },
  link: { fontFamily: typography.label.fontFamily, textDecorationLine: 'underline' },
  row: { flexDirection: 'row', gap: 8 },
});
