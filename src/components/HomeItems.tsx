import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, iconSize, radius, shadows, size as sizes, space, status, typography, ui, type CoverColor } from '@/theme/tokens';

import { AppText } from './AppText';
import { BookCover } from './BookCover';
import { Icon } from './Icon';

/** Чип темы на главной: таблетка 36 px, полупрозрачная белая. */
export function TopicChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => [styles.topic, pressed && styles.pressed]}
    >
      <Text style={styles.topicText}>{label}</Text>
    </Pressable>
  );
}

export type BannerTone = 'plain' | 'overdue' | 'available';

/** Баннер о самой важной брони на главной: обложка, факт со сроком, книга, шеврон. */
export function BookingBanner({
  tone,
  title,
  text,
  cover,
  onPress,
}: {
  tone: BannerTone;
  title: string;
  text: string;
  cover: CoverColor;
  onPress: () => void;
}) {
  const bg = tone === 'overdue' ? status.overdue.bg : tone === 'available' ? status.available.bg : ui.chipLgBg;
  const fg = tone === 'overdue' ? status.overdue.fg : tone === 'available' ? status.available.fg : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${title}. ${text}`}
      style={({ pressed }) => [styles.banner, { backgroundColor: bg }, pressed && styles.pressed]}
    >
      <BookCover color={cover} width={32} height={46} lines={1} />
      <View style={styles.bannerBody}>
        <Text style={[styles.bannerTitle, { color: fg }]}>{title}</Text>
        <AppText variant="caption" tone="secondary">
          {text}
        </AppText>
      </View>
      <Icon name="chevron" size={iconSize.button} color={colors.inkSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  topic: {
    height: sizes.chipLg,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    backgroundColor: ui.chipLgBg,
    borderWidth: 1,
    borderColor: colors.glassEdge,
  },
  topicText: { ...typography.caption, fontFamily: fonts.medium, color: colors.ink },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: space[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.glass,
  },
  bannerBody: { flex: 1, minWidth: 0, gap: 2 },
  bannerTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
});
