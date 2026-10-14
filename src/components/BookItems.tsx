import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, iconSize, radius, shadows, space, typography, ui, type CoverColor, type StatusTone } from '@/theme/tokens';

import { AppText } from './AppText';
import { BookCover } from './BookCover';
import { Icon } from './Icon';
import { StatusChip } from './StatusChip';

type Chip = { label: string; tone: StatusTone };

type BookBase = { title: string; color: CoverColor; coverUri?: string | null };

/** Строка результата: обложка, название в одну строку, мета, чип справа. Вся строка — ссылка. */
export function BookRow({
  book,
  meta,
  chip,
  highlighted,
  onPress,
}: {
  book: BookBase;
  meta: string;
  chip: Chip;
  /** Строка, которую только что забронировали (кольцо busy-dot, тёплый фон). */
  highlighted?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${book.title}. ${meta}. ${chip.label}`}
      style={({ pressed }) => [styles.row, highlighted && styles.highlighted, pressed && styles.pressed]}
    >
      <BookCover color={book.color} uri={book.coverUri} />
      <View style={styles.body}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {book.title}
        </Text>
        <AppText variant="caption" tone="secondary">
          {meta}
        </AppText>
      </View>
      <StatusChip label={chip.label} tone={chip.tone} />
    </Pressable>
  );
}

/** Плитка «Недавно вернулись»: обложка 100%×96, название в 2 строки, чип sm. */
export function BookTile({ book, chip, onPress }: { book: BookBase; chip: Chip; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${book.title}. ${chip.label}`}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <BookCover color={book.color} uri={book.coverUri} width="100%" height={96} />
      <Text style={styles.tileTitle} numberOfLines={2}>
        {book.title}
      </Text>
      <StatusChip label={chip.label} tone={chip.tone} size="sm" />
    </Pressable>
  );
}

/** Карточка брони: сверху ссылка на детали, снизу чип слева и одно действие справа. */
export function BookingCard({
  book,
  meta,
  metaTone = 'secondary',
  chip,
  overdue,
  action,
  onPress,
}: {
  book: BookBase;
  meta: string;
  metaTone?: 'secondary' | 'overdue';
  chip: Chip;
  /** Красная внутренняя обводка у просроченной. */
  overdue?: boolean;
  /** Кнопка tertiary md справа. */
  action?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <View style={[styles.card, overdue && { boxShadow: shadows.ringOverdueCard }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={`${book.title}. ${meta}`}
        style={({ pressed }) => [styles.cardLink, pressed && styles.pressed]}
      >
        <BookCover color={book.color} uri={book.coverUri} />
        <View style={styles.body}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {book.title}
          </Text>
          <AppText variant="caption" tone={metaTone}>
            {meta}
          </AppText>
        </View>
        <Icon name="chevron" size={iconSize.button} color={colors.inkSecondary} />
      </Pressable>
      <View style={styles.cardFooter}>
        <StatusChip label={chip.label} tone={chip.tone} />
        {action}
      </View>
    </View>
  );
}

/** Мини-карточка книги в стекле: обложка, название, автор, чип, шеврон (детали брони, подтверждение). */
export function BookSummaryCard({
  book,
  author,
  chip,
  onPress,
  coverSize = 'sm',
  plain,
}: {
  book: BookBase;
  author: string;
  chip?: Chip;
  onPress?: () => void;
  coverSize?: 'sm' | 'md';
  /** Белая карточка вместо стеклянной (шторка очереди). */
  plain?: boolean;
}) {
  const content = (
    <>
      <BookCover color={book.color} uri={book.coverUri} size={coverSize} />
      <View style={[styles.body, styles.summaryBody]}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {book.title}
        </Text>
        <AppText variant="caption" tone="secondary">
          {author}
        </AppText>
        {chip && (
          <View style={styles.summaryChip}>
            <StatusChip label={chip.label} tone={chip.tone} />
          </View>
        )}
      </View>
      {onPress && <Icon name="chevron" size={iconSize.button} color={colors.inkSecondary} />}
    </>
  );
  const style = [styles.summary, plain ? styles.summaryPlain : styles.summaryGlass];
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => [style, pressed && styles.pressed]}>
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

export type InfoItem = {
  label: string;
  value: string;
  /** Серое уточнение к значению: «(48 ч)». */
  note?: string;
  icon?: 'user' | 'calendar' | 'barcode';
  onPress?: () => void;
  /** Шеврон у значения-ссылки, даже если ссылка пока неактивна. */
  chevron?: boolean;
  tabular?: boolean;
  minHeight?: number;
};

/** Пары «подпись — значение» в белом блоке. */
export function InfoList({ items, compact }: { items: InfoItem[]; compact?: boolean }) {
  return (
    <View style={[styles.info, compact && styles.infoCompact]}>
      {items.map((it, i) => {
        const row = (
          <>
            <View style={styles.infoLabel}>
              {it.icon && <Icon name={it.icon} size={iconSize.button} color={colors.inkSecondary} />}
              <AppText variant="label" tone="secondary" style={styles.infoLabelText}>
                {it.label}
              </AppText>
            </View>
            <View style={styles.infoValue}>
              <AppText variant="label" tabular={it.tabular} align="right" style={styles.infoValueText}>
                {it.value}
                {it.note ? <Text style={{ color: colors.inkMuted }}> {it.note}</Text> : null}
              </AppText>
              {(it.onPress || it.chevron) && <Icon name="chevron" size={iconSize.table} color={colors.ink} />}
            </View>
          </>
        );
        const rowStyle = [styles.infoRow, it.minHeight ? { minHeight: it.minHeight } : null, i === items.length - 1 && styles.infoLast];
        return it.onPress ? (
          <Pressable key={it.label} onPress={it.onPress} accessibilityRole="button" style={rowStyle}>
            {row}
          </Pressable>
        ) : (
          <View key={it.label} style={rowStyle}>
            {row}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[2.5],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  highlighted: { boxShadow: shadows.ringWarning, backgroundColor: ui.highlightRowBg },
  body: { flex: 1, minWidth: 0, gap: space[0.5] },
  rowTitle: { ...typography.bodyStrong, color: colors.ink },
  tile: { flex: 1, gap: space[2], padding: space[2.5], borderRadius: radius.lg, backgroundColor: colors.surface },
  tileTitle: { ...typography.tableStrong, height: 34, color: colors.ink },
  card: { gap: space[2.5], padding: space[2.5], borderRadius: radius.lg, backgroundColor: colors.surface },
  cardLink: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  summaryGlass: {
    padding: space[3],
    borderRadius: radius.xl,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.glass,
  },
  summaryPlain: { padding: space[2.5], borderRadius: radius.lg, backgroundColor: colors.surface },
  summaryBody: { gap: space[0.5] },
  summaryChip: { marginTop: space[1] },
  info: { paddingHorizontal: space[4], paddingVertical: space[1], borderRadius: radius.xl, backgroundColor: colors.surface },
  infoCompact: { paddingVertical: space[0.5] },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLast: { borderBottomWidth: 0 },
  infoLabel: { flexDirection: 'row', alignItems: 'center', gap: space[3], flexShrink: 0 },
  infoLabelText: { fontFamily: fonts.regular },
  infoValue: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: space[1] },
  infoValueText: { flexShrink: 1 },
});
