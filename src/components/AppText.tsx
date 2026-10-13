import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, status, typography } from '@/theme/tokens';

export type TextVariant = keyof typeof typography;

export type TextTone =
  | 'ink'
  | 'secondary'
  | 'muted'
  | 'neutral'
  | 'onDark'
  | 'available'
  | 'busy'
  | 'overdue';

const TONE: Record<TextTone, string> = {
  ink: colors.ink,
  secondary: colors.inkSecondary,
  muted: colors.inkMuted,
  neutral: status.neutral.fg,
  onDark: colors.onDark,
  available: status.available.fg,
  busy: status.busy.fg,
  overdue: status.overdue.fg,
};

type Props = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Цифры в колонках и сроках — моноширинные. */
  tabular?: boolean;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
};

export function AppText({ variant = 'body', tone = 'ink', tabular, align, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color: TONE[tone] },
        tabular && styles.tabular,
        align !== undefined && { textAlign: align },
        style,
      ]}
    />
  );
}

/** Двухцветный заголовок: ключевая часть ink, связка ink-muted («Мои *брони*»). */
export function TwoToneTitle({
  text,
  muted,
  mutedFirst = false,
  variant = 'display',
  align,
  style,
}: {
  text: string;
  muted?: string;
  mutedFirst?: boolean;
  variant?: TextVariant;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
}) {
  const mutedNode = muted ? <Text style={{ color: colors.inkMuted }}>{muted}</Text> : null;
  return (
    <AppText variant={variant} align={align} style={style} accessibilityRole="header">
      {mutedFirst && mutedNode}
      {mutedFirst && muted ? ' ' : ''}
      {text}
      {!mutedFirst && muted ? ' ' : ''}
      {!mutedFirst && mutedNode}
    </AppText>
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
});
