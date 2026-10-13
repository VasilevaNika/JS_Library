import { StyleSheet, View } from 'react-native';

import { colors, radius, size as sizes, status, typography, ui, type StatusTone } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = {
  label: string;
  tone: StatusTone;
  /** sm 26 — десктоп и плитки, md 30 — мобильные списки, lg 36 — карточка книги (с точкой). */
  size?: 'sm' | 'md' | 'lg';
};

/** Статус всегда словом, цвет — дополнительный сигнал. Не переносится и не сжимается. */
export function StatusChip({ label, tone, size = 'md' }: Props) {
  const t = status[tone];
  const lg = size === 'lg';
  return (
    <View
      style={[
        styles.chip,
        { height: lg ? sizes.chipLg : size === 'sm' ? sizes.chipSm : sizes.chipMd, backgroundColor: t.bg },
        lg && styles.lg,
      ]}
    >
      {lg && <View style={[styles.dot, { backgroundColor: t.dot }]} />}
      <AppText variant="micro" numberOfLines={1} style={[{ color: t.fg }, lg && styles.lgText]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  lg: {
    gap: 8,
    paddingLeft: 12,
    paddingRight: 14,
    backgroundColor: ui.chipLgBg,
    borderWidth: 1,
    borderColor: colors.glassEdge,
  },
  lgText: { fontSize: typography.caption.fontSize },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
