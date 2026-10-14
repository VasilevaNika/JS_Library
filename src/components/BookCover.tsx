import { Image } from 'expo-image';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { colors, type CoverColor, coverGradient, covers, radius, shadows, space, typography, ui } from '@/theme/tokens';

export type CoverSize = 'sm' | 'md' | 'lg';

const SIZES: Record<CoverSize, { width: number; height: number }> = {
  sm: { width: 40, height: 58 },
  md: { width: 44, height: 64 },
  lg: { width: 152, height: 224 },
};

type Props = {
  color: CoverColor;
  size?: CoverSize;
  /** Произвольный размер: плитка 100%×96, баннер 32×46, шторка 96×140, desktop 28×40. */
  width?: DimensionValue;
  height?: number;
  /** Сколько линий-«корешков» рисовать на заглушке (в баннерах — одна). */
  lines?: 0 | 1 | 2;
  /** Тень и скругление «большой» обложки (шторка возврата). */
  raised?: boolean;
  uri?: string | null;
  /** Только для lg: название, подзаголовок и авторы на обложке. */
  title?: string;
  subtitle?: string;
  authors?: string;
  accessibilityLabel?: string;
};

/** Обложка-заглушка: градиент 160°, скругление корешок 3 / срез 7. Единственный по-настоящему цветной объект. */
export function BookCover({
  color,
  size = 'sm',
  width,
  height,
  lines = 2,
  raised,
  uri,
  title,
  subtitle,
  authors,
  accessibilityLabel,
}: Props) {
  const lg = size === 'lg';
  const box = SIZES[size];
  const lineColor =
    color === 'mustard' ? ui.coverLineDark : color === 'graphite' ? ui.coverLineGraphite : undefined;
  const lineHeight = color === 'graphite' ? 2 : 3;
  const spine = lg ? 4 : raised ? 4 : radius.coverSpine;
  const cut = lg ? 12 : raised ? 10 : radius.cover;
  return (
    <View
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[
        styles.cover,
        {
          width: width ?? box.width,
          height: height ?? box.height,
          borderTopLeftRadius: spine,
          borderBottomLeftRadius: spine,
          borderTopRightRadius: cut,
          borderBottomRightRadius: cut,
          backgroundColor: covers[color].from,
          experimental_backgroundImage: coverGradient(color),
          boxShadow: lg ? shadows.coverLg : raised ? shadows.coverMd : shadows.coverSm,
        },
        lg && styles.lg,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : lg ? (
        <>
          <View style={styles.ring} />
          <View style={styles.lgTitle}>
            {title ? <Text style={styles.lgTitleText}>{title}</Text> : null}
            {subtitle ? <Text style={styles.lgSubtitle}>{subtitle}</Text> : null}
          </View>
          {authors ? <Text style={styles.lgAuthors}>{authors.toLocaleUpperCase('ru-RU')}</Text> : null}
        </>
      ) : (
        <>
          {lines >= 1 && <View style={[styles.line, { height: lineHeight }, lineColor ? { backgroundColor: lineColor } : null]} />}
          {lines >= 2 && (
            <View style={[styles.line, styles.line2, { height: lineHeight }, lineColor ? { backgroundColor: lineColor } : null]} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { overflow: 'hidden', flexShrink: 0 },
  lg: { paddingTop: space[4.5], paddingRight: space[3.5], paddingBottom: space[4], paddingLeft: space[5], justifyContent: 'space-between' },
  line: {
    position: 'absolute',
    left: '20%',
    right: '14%',
    top: '17%',
    borderRadius: 2,
    backgroundColor: ui.coverLine,
  },
  line2: { top: '28%', right: '34%', backgroundColor: ui.coverLine2 },
  ring: {
    position: 'absolute',
    right: -36,
    top: 72,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    borderColor: ui.coverRing,
  },
  lgTitle: { gap: space[1.5] },
  lgTitleText: { ...typography.coverTitle, color: colors.onDark },
  lgSubtitle: { ...typography.coverSubtitle, color: colors.onDark, opacity: 0.85 },
  lgAuthors: { ...typography.coverAuthors, color: colors.onDark, opacity: 0.8 },
});
