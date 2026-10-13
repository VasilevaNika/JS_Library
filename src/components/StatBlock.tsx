import { StyleSheet, View } from 'react-native';

import { backgrounds, colors, fonts, radius, size, space, status } from '@/theme/tokens';

import { AppText } from './AppText';

export type StatItem = {
  label: string;
  value: number | string;
  /** Подсветка ячейки: available — зелёная, overdue — красная. */
  tone?: 'available' | 'overdue';
};

type Props = {
  /** Три счётчика: широкая таблетка, таблетка, диск. Самое важное — первым. */
  items: [StatItem, StatItem, StatItem];
  /** Относительная ширина второй таблетки (в макетах 1.3 или 1.4). */
  secondFlex?: number;
};

export function StatBlock({ items, secondFlex = 1.3 }: Props) {
  return (
    <View style={styles.row}>
      {items.map((it, i) => {
        const disc = i === 2;
        const tone = it.tone ? status[it.tone] : null;
        return (
          <View key={it.label} style={[styles.stat, disc ? styles.discStat : { flex: i === 0 ? 2 : secondFlex }]}>
            <AppText variant="micro" tone="secondary" style={[styles.label, disc && styles.discLabel]} numberOfLines={1}>
              {it.label}
            </AppText>
            <View style={[styles.value, disc && styles.disc, tone && { backgroundColor: tone.bg }]}>
              <AppText style={[styles.valueText, tone && { color: tone.fg }]} tabular>
                {it.value}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[2] },
  stat: { gap: space[2] },
  discStat: { flexShrink: 0 },
  label: { paddingLeft: space[2], fontFamily: fonts.regular },
  discLabel: { paddingLeft: 0 },
  value: {
    height: size.controlLg,
    justifyContent: 'center',
    paddingHorizontal: space[5],
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  disc: {
    width: size.controlLg,
    paddingHorizontal: 0,
    alignItems: 'center',
    borderRadius: size.controlLg / 2,
    backgroundColor: colors.surface,
    experimental_backgroundImage: backgrounds.statDisc,
    borderWidth: 1,
    borderColor: colors.line,
  },
  valueText: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26 },
});
