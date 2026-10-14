import type { ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { backgrounds, colors, coverGradient, covers, fonts, radius, shadows, space, status, ui, type StatusTone } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

// ───────── Skeleton ─────────

/** Кость скелетона: line — строка текста, block — обложка/карточка, flat — чип/кнопка, glass — на стекле. */
export function Bone({
  width,
  height,
  r,
  kind = 'line',
  style,
}: {
  width?: DimensionValue;
  height: number;
  r?: number;
  kind?: 'line' | 'block' | 'flat' | 'flatSunken' | 'glass';
  style?: StyleProp<ViewStyle>;
}) {
  const fill: ViewStyle =
    kind === 'line'
      ? { backgroundColor: ui.skeleton, experimental_backgroundImage: backgrounds.skeleton }
      : kind === 'block'
        ? { backgroundColor: ui.skeleton, experimental_backgroundImage: backgrounds.skeletonBlock }
        : kind === 'flat'
          ? { backgroundColor: colors.divider }
          : kind === 'flatSunken'
            ? { backgroundColor: colors.surfaceSunken }
            : { backgroundColor: ui.skeletonStat };
  return <View style={[{ width, height, borderRadius: r ?? height / 2 }, fill, style]} />;
}

/** Скелетон строки результата (S2). */
export function SkeletonRow({ titleWidth = '78%' }: { titleWidth?: DimensionValue }) {
  return (
    <View style={styles.skRow}>
      <Bone kind="block" width={40} height={58} r={6} />
      <View style={styles.skLines}>
        <Bone width={titleWidth} height={12} />
        <Bone width="40%" height={10} />
      </View>
      <Bone kind="flat" width={72} height={30} />
    </View>
  );
}

/** Скелетон карточки брони (S8). */
export function SkeletonBookingCard({ titleWidth = '70%' }: { titleWidth?: DimensionValue }) {
  return (
    <View style={styles.skCard}>
      <View style={styles.skCardTop}>
        <Bone kind="block" width={40} height={58} r={6} />
        <View style={[styles.skLines, styles.skLinesTop]}>
          <Bone width={titleWidth} height={12} />
          <Bone width="50%" height={10} />
        </View>
      </View>
      <View style={styles.skCardFooter}>
        <Bone kind="flat" width={96} height={30} />
        <Bone kind="flatSunken" width={112} height={44} />
      </View>
    </View>
  );
}

/** Скелетон StatBlock (S8). */
export function SkeletonStats() {
  return (
    <View style={styles.skStats}>
      <Bone kind="glass" height={56} style={styles.flex2} />
      <Bone kind="glass" height={56} style={styles.flex14} />
      <Bone kind="glass" width={56} height={56} />
    </View>
  );
}

/** Стеклянная подложка скелетона: rgba(255,255,255,0.5), радиус 2xl. */
export function SkeletonPanel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.skPanel, style]}>{children}</View>;
}

// ───────── Иконка в круге ─────────

/** Круг с иконкой для пустых экранов и результатов: success, error, retry, info. */
export function StatusIcon({
  icon,
  tone,
  size = 72,
  shape = 'circle',
}: {
  icon: IconName;
  tone: StatusTone | 'white' | 'sunken';
  size?: number;
  /** rounded — квадрат со скруглением (импорт: иконка файла). */
  shape?: 'circle' | 'rounded';
}) {
  const bg = tone === 'white' ? colors.surface : tone === 'sunken' ? colors.surfaceSunken : status[tone].bg;
  const fg = tone === 'white' ? colors.ink : tone === 'sunken' ? status.neutral.fg : status[tone].fg;
  return (
    <View
      style={[
        styles.icon,
        { width: size, height: size, borderRadius: shape === 'circle' ? size / 2 : Math.round(size * 0.3), backgroundColor: bg },
        tone === 'white' && { boxShadow: shadows.iconCircle },
      ]}
    >
      <Icon name={icon} size={Math.round(size / 3)} color={fg} />
    </View>
  );
}

// ───────── Иллюстрации полки ─────────

export type ShelfVariant = 'empty' | 'noBookings' | 'notFound';

/** Слоты Hero_Placeholder_*: полка с книгами. */
export function ShelfIllustration({ variant, label }: { variant: ShelfVariant; label: string }) {
  if (variant === 'notFound') {
    return (
      <View accessibilityRole="image" accessibilityLabel={label} style={styles.nf}>
        <View style={styles.nfBooks}>
          <View style={[styles.nfBook, { width: 12, height: 50, backgroundColor: covers.teal.from, experimental_backgroundImage: coverGradient('teal', true) }]} />
          <View style={[styles.nfBook, { width: 10, height: 58, backgroundColor: covers.terracotta.from, experimental_backgroundImage: coverGradient('terracotta', true) }]} />
          <View style={[styles.nfBook, styles.nfGap]} />
          <View style={[styles.nfBook, { width: 13, height: 44, backgroundColor: covers.mustard.from, experimental_backgroundImage: coverGradient('mustard') }]} />
          <View style={[styles.nfBook, { width: 10, height: 60, backgroundColor: covers.graphite.from, experimental_backgroundImage: coverGradient('graphite') }]} />
        </View>
        <View style={styles.nfPlank} />
      </View>
    );
  }
  const big = variant === 'noBookings';
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.shelf, big ? styles.shelfBig : styles.shelfSmall]}
    >
      <View style={styles.shelfBooks}>
        <View
          style={[styles.shelfBook, { width: big ? 22 : 20, height: big ? 112 : 84, backgroundColor: covers.teal.from, experimental_backgroundImage: coverGradient('teal', true) }]}
        />
        <View
          style={[
            styles.shelfBook,
            styles.leaning,
            { width: big ? 20 : 18, height: big ? 104 : 72, backgroundColor: covers.terracotta.from, experimental_backgroundImage: coverGradient('terracotta', true) },
          ]}
        />
        <View style={styles.flex1} />
      </View>
      <View style={[styles.plank, { height: big ? 10 : 8 }]} />
    </View>
  );
}

// ───────── EmptyState ─────────

/** Пустой экран: иллюстрация или иконка, заголовок, одно предложение, до двух действий. */
export function EmptyState({
  visual,
  title,
  text,
  actions,
  container = 'glass',
  titleSize = 'title',
  style,
}: {
  visual?: ReactNode;
  title: string;
  text?: string;
  actions?: ReactNode;
  /** glass — мобильная стеклянная карточка, card — белая карточка desktop, none — без подложки. */
  container?: 'glass' | 'card' | 'none';
  titleSize?: 'title' | 'titleLg' | 'headline';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityRole="summary"
      style={[styles.empty, container === 'glass' && styles.emptyGlass, container === 'card' && styles.emptyCard, style]}
    >
      {visual}
      <View style={styles.emptyText}>
        <AppText variant={titleSize} align="center" style={titleSize === 'headline' && styles.semibold}>
          {title}
        </AppText>
        {text ? (
          <AppText variant="body" tone="secondary" align="center" style={styles.emptyBody}>
            {text}
          </AppText>
        ) : null}
      </View>
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  flex14: { flex: 1.4 },
  semibold: { fontFamily: fonts.semibold },
  skRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  skLines: { flex: 1, gap: space[2] },
  skLinesTop: { paddingTop: space[2] },
  skCard: { gap: 10, padding: 10, borderRadius: radius.lg, backgroundColor: colors.surface },
  skCardTop: { flexDirection: 'row', gap: space[3] },
  skCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  skStats: { flexDirection: 'row', gap: space[2], marginTop: space[6] },
  skPanel: {
    gap: space[3],
    paddingTop: space[4],
    paddingHorizontal: space[3],
    paddingBottom: space[3],
    borderRadius: radius['2xl'],
    backgroundColor: ui.skeletonGlass,
  },
  icon: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  shelf: { alignSelf: 'stretch', borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.surface },
  shelfSmall: { height: 156, paddingHorizontal: space[6], paddingBottom: space[5], experimental_backgroundImage: backgrounds.shelfCard },
  shelfBig: { height: 220, paddingHorizontal: 48, paddingBottom: 28, experimental_backgroundImage: backgrounds.shelfNoBookings },
  shelfBooks: { flexDirection: 'row', alignItems: 'flex-end', gap: space[1], paddingHorizontal: space[2] },
  shelfBook: { borderRadius: 3 },
  leaning: { transform: [{ rotate: '-14deg' }], transformOrigin: 'bottom right' },
  plank: { borderRadius: 4, backgroundColor: backgrounds.shelfPlankFlat, experimental_backgroundImage: backgrounds.shelfPlank },

  nf: {
    width: 96,
    height: 96,
    flexShrink: 0,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingHorizontal: space[3],
    paddingBottom: 14,
    backgroundColor: colors.surface,
    experimental_backgroundImage: backgrounds.shelfNotFound,
  },
  nfBooks: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  nfBook: { borderRadius: 2 },
  nfGap: { width: 14, height: 54, borderWidth: 1.5, borderStyle: 'dashed', borderColor: backgrounds.shelfGapBorder },
  nfPlank: { height: 5, borderRadius: 3, backgroundColor: backgrounds.shelfPlankFlat },

  empty: { alignItems: 'center', gap: space[4] },
  emptyGlass: {
    paddingTop: space[8],
    paddingHorizontal: space[5],
    paddingBottom: space[5],
    borderRadius: radius['2xl'],
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.glass,
  },
  emptyCard: { paddingVertical: 72, paddingHorizontal: space[6], borderRadius: radius.xl, backgroundColor: colors.surface },
  emptyText: { gap: space[2], alignItems: 'center' },
  emptyBody: { maxWidth: 460 },
});
