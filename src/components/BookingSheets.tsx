import { StyleSheet, Text, View } from 'react-native';

import { plural } from '@/lib/format';
import { colors, fonts, radius, space, status, typography, type CoverColor } from '@/theme/tokens';

import { AppText, TwoToneTitle } from './AppText';
import { BookCover } from './BookCover';
import { Button } from './Button';
import { BottomSheet } from './Feedback';
import { StatusIcon } from './States';

/** S4-B1 · «Вы N-й в очереди»: результат «Встать в очередь». */
export function QueueSheet({
  visible,
  position,
  title,
  author,
  cover,
  holdHours,
  onClose,
  onMyBookings,
}: {
  visible: boolean;
  position: number;
  title: string;
  author: string;
  cover: CoverColor;
  holdHours: number;
  onClose: () => void;
  onMyBookings: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <StatusIcon icon="clock" tone="available" size={56} />
        <TwoToneTitle text={`Вы ${position}-й`} muted="в очереди" variant="title" />
      </View>
      <View style={styles.book}>
        <BookCover color={cover} width={32} height={46} lines={1} />
        <View style={styles.bookText}>
          <Text style={styles.bookTitle}>{title}</Text>
          <AppText variant="caption" tone="secondary">
            {author}
          </AppText>
        </View>
      </View>
      <AppText tone="neutral">
        Когда книга освободится, мы напишем на почту и в Telegram. У вас будет {holdHours} {plural(holdHours, ['час', 'часа', 'часов'])}, чтобы её забрать.
      </AppText>
      <View style={styles.row}>
        <Button label="Мои брони" variant="secondary" onPress={onMyBookings} style={styles.flex} />
        <Button label="Понятно" variant="dark" onPress={onClose} style={styles.flex12} />
      </View>
    </BottomSheet>
  );
}

/** S8-D2 · «Вы вернули … на полку?» — подтверждение возврата; вариант просрочки с красной строкой. */
export function ReturnSheet({
  visible,
  title,
  cover,
  overdueText,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  cover: CoverColor;
  /** «Срок возврата прошёл 12 сентября.» — только для просроченной. */
  overdueText?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} strongBackdrop>
      <View style={styles.coverWrap}>
        <BookCover color={cover} width={96} height={140} raised />
      </View>
      <TwoToneTitle text={`Вы вернули «${title}»`} muted="на полку?" variant="title" align="center" />
      {overdueText ? <Text style={styles.overdue}>{overdueText}</Text> : null}
      <AppText tone="neutral" align="center">
        Книга сразу появится в каталоге как доступная. Библиотекарь проверит её при обходе.
      </AppText>
      <View style={styles.column}>
        <Button label="Да, книга на полке" variant="dark" icon="check" block onPress={onConfirm} />
        <Button label="Ещё не вернул" variant="secondary" block onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex12: { flex: 1.2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  book: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: 10, borderRadius: radius.lg, backgroundColor: colors.surface },
  bookText: { flex: 1, gap: 2 },
  bookTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.ink },
  row: { flexDirection: 'row', gap: space[2] },
  coverWrap: { alignItems: 'center', paddingVertical: space[2] },
  overdue: { ...typography.label, color: status.overdue.fg, textAlign: 'center' },
  column: { gap: space[2], paddingTop: space[1] },
});
