import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  avatarGradient,
  backgrounds,
  colors,
  covers,
  fonts,
  radius,
  shadows,
  space,
  status,
  typography,
  ui,
  type CoverColor,
  type StatusTone,
} from '@/theme/tokens';

import { AppText, TwoToneTitle } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';
import { StatusChip } from './StatusChip';

/** Большая стеклянная панель desktop: заголовок слева, действия справа. */
export function Panel({
  title,
  muted,
  titleVariant = 'titleLg',
  leading,
  actions,
  children,
  style,
}: {
  title?: string;
  muted?: string;
  titleVariant?: 'titleLg' | 'title';
  /** Слева от заголовка — кнопка «Назад». */
  leading?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.panel, style]}>
      {(title || actions) && (
        <View style={styles.panelHead}>
          <View style={styles.panelTitle}>
            {leading}
            {title ? <TwoToneTitle text={title} muted={muted} variant={titleVariant} style={!leading && styles.titleIndent} /> : null}
          </View>
          {actions ? <View style={styles.panelActions}>{actions}</View> : null}
        </View>
      )}
      {children}
    </View>
  );
}

type ChipTone = 'all' | 'busy' | 'overdue' | 'neutral';

const FILTER_TONE: Record<ChipTone, { bg: string; fg: string; count: string }> = {
  all: { bg: colors.surface, fg: colors.ink, count: colors.surfaceSunken },
  busy: { bg: status.busy.bg, fg: status.busy.fg, count: ui.countOnTone },
  overdue: { bg: status.overdue.bg, fg: status.overdue.fg, count: ui.countOnTone },
  neutral: { bg: status.neutral.bg, fg: status.neutral.fg, count: ui.countOnNeutral },
};

/** Компактный фильтр журнала со счётчиком. Выбранный — ink. */
export function FilterChip({
  label,
  count,
  tone,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  tone: ChipTone;
  selected: boolean;
  onPress: () => void;
}) {
  const t = FILTER_TONE[tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${count}`}
      style={[styles.filter, { backgroundColor: selected ? colors.ink : t.bg }]}
    >
      <Text style={[styles.filterText, { color: selected ? colors.onDark : t.fg }]}>{label}</Text>
      <View style={[styles.filterCount, { backgroundColor: selected ? ui.onDarkTrack : t.count }]}>
        <Text style={[styles.filterText, styles.tabular, { color: selected ? colors.onDark : t.fg }]}>{count}</Text>
      </View>
    </Pressable>
  );
}

/** Крупная таблетка-счётчик итога проверки импорта. */
export function CounterPill({
  label,
  count,
  tone,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  tone: 'plain' | 'available' | 'neutral' | 'overdue';
  selected?: boolean;
  onPress?: () => void;
}) {
  const bg = selected ? colors.ink : tone === 'plain' ? colors.surface : status[tone].bg;
  const fg = selected ? colors.onDark : tone === 'plain' ? colors.ink : status[tone].fg;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[styles.counter, { backgroundColor: bg }]}
    >
      <Text style={[typography.micro, styles.regular, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.counterValue, { color: fg }]}>{count}</Text>
    </Pressable>
  );
}

export type Column<T> = {
  key: string;
  title: string;
  /** Ширина колонки; без неё колонка тянется. */
  width?: number;
  flex?: number;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
};

/** Плотная таблица desktop: строки 44 px, текст 13 px, цифры tabular. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 960,
  rowStyle,
  onRowPress,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  minWidth?: number;
  rowStyle?: (row: T) => StyleProp<ViewStyle>;
  onRowPress?: (row: T) => void;
}) {
  const cell = (c: Column<T>, i: number): ViewStyle => ({
    width: c.width,
    flex: c.width ? undefined : (c.flex ?? 1),
    paddingLeft: i === 0 ? space[5] : space[3],
    paddingRight: i === columns.length - 1 ? space[5] : space[3],
    alignItems: c.align === 'right' ? 'flex-end' : 'flex-start',
  });
  return (
    <View style={styles.table}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableScroll}>
        <View style={{ minWidth, flex: 1 }}>
          <View style={[styles.tr, styles.thead]}>
            {columns.map((c, i) => (
              <View key={c.key} style={cell(c, i)}>
                <Text style={styles.th}>{c.title}</Text>
              </View>
            ))}
          </View>
          {rows.map((r) => (
            <Pressable
              key={rowKey(r)}
              onPress={onRowPress ? () => onRowPress(r) : undefined}
              disabled={!onRowPress}
              style={[styles.tr, styles.trBody, rowStyle?.(r)]}
            >
              {columns.map((c, i) => (
                <View key={c.key} style={cell(c, i)}>
                  {c.render(r)}
                </View>
              ))}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/** Текст ячейки таблицы: 13 px; tabular для дат. */
export function Cell({
  children,
  tone = 'ink',
  tabular,
  strong,
  style,
}: {
  children: ReactNode;
  tone?: 'ink' | 'neutral' | 'muted' | 'overdue';
  tabular?: boolean;
  strong?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const color =
    tone === 'neutral' ? status.neutral.fg : tone === 'muted' ? colors.inkMuted : tone === 'overdue' ? status.overdue.fg : colors.ink;
  return (
    <Text
      style={[styles.td, { color }, tabular && styles.tabular, strong && { fontFamily: fonts.semibold }, style]}
      numberOfLines={2}
    >
      {children}
    </Text>
  );
}

/** Аватар: инициалы на градиенте обложки или фото. */
export function Avatar({
  initials,
  color,
  size = 30,
  children,
}: {
  initials: string;
  color: CoverColor;
  size?: number;
  children?: ReactNode;
}) {
  const fontSize = size >= 80 ? 28 : size >= 64 ? 22 : size >= 48 ? 16 : size >= 40 ? 13 : 11;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: covers[color].from, experimental_backgroundImage: avatarGradient(color) },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize }]}>{initials}</Text>
      {children}
    </View>
  );
}

/** Видоискатель QR: тёмный градиент, белые уголки, линия scan-line. Без камеры — нейтральная плашка. */
export function ScanViewfinder({ noCamera, children }: { noCamera?: boolean; children?: ReactNode }) {
  if (noCamera) {
    return (
      <View accessibilityRole="text" style={styles.noCamera}>
        <Icon name="cameraOff" size={24} color={status.neutral.fg} />
        <AppText variant="label" tone="neutral" style={styles.flex}>
          Нет доступа к камере. Введите код брони вручную — поле уже в фокусе.
        </AppText>
      </View>
    );
  }
  return (
    <View accessibilityRole="image" accessibilityLabel="Зона сканирования QR-кода" style={styles.scan}>
      {children}
      <View pointerEvents="none" style={styles.frame}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr2]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
        <View style={styles.scanLine} />
      </View>
      <Text pointerEvents="none" style={styles.scanCaption}>
        Наведите камеру на QR-код брони
      </Text>
    </View>
  );
}

/** Полоса прогресса сверки. */
export function ProgressBar({ value }: { value: number }) {
  const width: DimensionValue = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={styles.progress}
    >
      <View style={[styles.progressFill, { width }]} />
    </View>
  );
}

/** Карточка сверки: книга, кто и когда, статус, три действия. */
export function ReconciliationCard({
  title,
  who,
  chip,
  overdue,
  onClose,
  onMissing,
  onPostpone,
}: {
  title: string;
  who: string;
  chip: { label: string; tone: StatusTone };
  overdue?: boolean;
  onClose: () => void;
  onMissing: () => void;
  onPostpone: () => void;
}) {
  return (
    <View style={[styles.recon, overdue && { boxShadow: shadows.ringOverdueCard }]}>
      <View style={styles.reconHead}>
        <View style={styles.flexShrink}>
          <AppText variant="label" style={styles.semibold}>
            {title}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {who}
          </AppText>
        </View>
        <StatusChip label={chip.label} tone={chip.tone} size="sm" />
      </View>
      <View style={styles.reconActions}>
        <Button label="На полке — закрыть" variant="positive" size="sm" onPress={onClose} />
        <Button label="Нет на полке" variant="negative" size="sm" onPress={onMissing} />
        <Button label="Отложить" variant="tertiary" size="sm" onPress={onPostpone} />
      </View>
    </View>
  );
}

export type TimelineEvent = { key: string | number; title: string; caption: string; tone: StatusTone };

/** История статусов: точка цвета статуса, событие, «дата · кто». */
export function StatusTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <View style={styles.timeline}>
      {events.map((e) => (
        <View key={e.key} style={styles.event}>
          <View style={[styles.dot, { backgroundColor: status[e.tone].dot }]} />
          <View style={styles.flexShrink}>
            <AppText variant="label">{e.title}</AppText>
            <AppText variant="caption" tone="secondary">
              {e.caption}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Пунктирная область загрузки таблицы. */
export function Dropzone({ children }: { children: ReactNode }) {
  return <View style={styles.dropzone}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1, minWidth: 0 },
  regular: { fontFamily: fonts.regular },
  semibold: { fontFamily: fonts.semibold },
  tabular: { fontVariant: ['tabular-nums'] },
  titleIndent: { marginLeft: space[1] },
  panel: {
    gap: space[4],
    padding: space[5],
    borderRadius: radius.sheet,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.glass,
  },
  panelHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  panelTitle: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  panelActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },

  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: 40,
    paddingLeft: space[4],
    paddingRight: space[2],
    borderRadius: radius.pill,
  },
  filterText: { ...typography.caption, fontFamily: fonts.medium },
  filterCount: {
    minWidth: 28,
    height: 26,
    paddingHorizontal: space[2],
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: { flex: 1, height: 60, justifyContent: 'center', gap: 2, paddingHorizontal: space[5], borderRadius: radius.pill },
  counterValue: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 24 },

  table: { borderRadius: radius.xl, backgroundColor: colors.surface, overflow: 'hidden' },
  tableScroll: { flexGrow: 1 },
  tr: { flexDirection: 'row', alignItems: 'center' },
  thead: { height: 40, borderBottomWidth: 1, borderBottomColor: colors.divider },
  trBody: { minHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.surfaceSunken },
  th: { ...typography.micro, color: colors.inkSecondary },
  td: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },

  avatar: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontFamily: fonts.semibold, color: colors.onDark },

  noCamera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    padding: space[5],
    borderRadius: radius.xl,
    backgroundColor: status.neutral.bg,
  },
  scan: {
    height: 180,
    borderRadius: radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scanGround,
    experimental_backgroundImage: backgrounds.scan,
  },
  frame: { width: 112, height: 112 },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: ui.scanFrame },
  tl: { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 10 },
  tr2: { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 10 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 10 },
  br: { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 10 },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 54,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.scanLine,
    boxShadow: `0 0 12px 2px ${ui.scanGlow}`,
  },
  scanCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: space[3],
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: ui.scanCaption,
  },

  progress: { height: 8, borderRadius: 4, backgroundColor: ui.progressTrack, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: status.available.dot },

  recon: { gap: 10, paddingVertical: space[3], paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: colors.surface },
  reconHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  reconActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },

  timeline: { gap: 14, paddingHorizontal: space[2] },
  event: { flexDirection: 'row', gap: space[3] },
  dot: { width: 10, height: 10, marginTop: 5, borderRadius: 5, flexShrink: 0 },

  dropzone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    paddingVertical: 64,
    paddingHorizontal: space[6],
    borderRadius: radius['2xl'],
    backgroundColor: ui.countOnTone,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: ui.dropzoneBorder,
  },
});
