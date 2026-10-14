// M2 · Выдача и сверка. Выдача: бронь найдена, несколько броней, нет доступа к камере, код не найден,
// бронь истекла, выдано. Сверка: список по стеллажам, всё сверено, диалог «нет на полке».
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppText,
  Avatar,
  BookCover,
  Button,
  CheckboxRow,
  DateField,
  Dialog,
  EmptyState,
  Notice,
  Panel,
  ProgressBar,
  ReconciliationCard,
  ScanViewfinder,
  StatusChip,
  StatusIcon,
  TextField,
  Toast,
  TwoToneTitle,
} from '@/components';
import {
  closeOnShelf,
  defaultDueDate,
  getReconciliation,
  getSettings,
  initials,
  issueBookings,
  issueWithoutBooking,
  lookupForIssue,
  markMissing,
  postponeCheck,
  type BookingWithBookAndUser,
  type IssueLookup,
} from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { useSession } from '@/hooks/useSession';
import { JOURNAL_STATUS } from '@/lib/bookingStatus';
import { dayMonth, dayMonthTime, numericDay, plural } from '@/lib/format';
import { countWord, declineName, isFemale } from '@/lib/names';
import { colors, fonts, radius, space, typography } from '@/theme/tokens';

type Done = { text: string };

export default function IssueScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { user } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [query, setQuery] = useState(params.code ?? '');
  const [lookup, setLookup] = useState<IssueLookup | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [dueAt, setDueAt] = useState<number | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [missing, setMissing] = useState<BookingWithBookAndUser | null>(null);
  const [comment, setComment] = useState('');
  const [autoLooked, setAutoLooked] = useState(false);

  const settings = useQuery(() => getSettings(), []);
  const recon = useQuery(() => getReconciliation(), []);

  useEffect(() => {
    if (Platform.OS !== 'web' && permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const cameraOn = Platform.OS !== 'web' && !!permission?.granted;

  const find = async (text: string) => {
    const value = text.trim();
    if (!value) return;
    setDone(null);
    const res = await lookupForIssue(value);
    setLookup(res);
    if (res.kind === 'found') {
      setSelected(res.bookings.map((b) => b.id));
      setDueAt(await defaultDueDate());
    }
  };

  // Переход из журнала с кодом брони — сразу ищем её.
  if (params.code && !autoLooked) {
    setAutoLooked(true);
    void find(params.code);
  }

  const reset = (text: string) => {
    setQuery('');
    setLookup(null);
    setSelected([]);
    setDone({ text });
  };

  const issue = async () => {
    if (lookup?.kind !== 'found' || !user || dueAt === null) return;
    const chosen = lookup.bookings.filter((b) => selected.includes(b.id));
    if (!chosen.length) return;
    await issueBookings(
      chosen.map((b) => b.id),
      dueAt,
      user.id,
    );
    const titles = chosen.map((b) => `«${b.book.title}»`).join(', ');
    reset(`Выдано: ${titles} → ${chosen[0].user.fullName}, вернуть до ${dayMonth(dueAt)}. Поле очищено для следующего.`);
  };

  const issueExpired = async () => {
    if (lookup?.kind !== 'expired' || !user) return;
    const due = await defaultDueDate();
    const b = lookup.booking;
    await issueWithoutBooking(b.userId, b.bookId, due, user.id);
    reset(`Выдано: «${b.book.title}» → ${b.user.fullName}, вернуть до ${dayMonth(due)}. Поле очищено для следующего.`);
  };

  const loanDays = settings.data?.loanDays ?? 14;
  const r = recon.data;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.columns}>
        {/* ───── Выдача ───── */}
        <Panel title="Выдача" style={styles.half}>
          <ScanViewfinder noCamera={!cameraOn}>
            {cameraOn && (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={
                  lookup || done
                    ? undefined
                    : ({ data }) => {
                        setQuery(data);
                        void find(data);
                      }
                }
              />
            )}
          </ScanViewfinder>

          <TextField
            size="md"
            label="Код брони или имя студента"
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setLookup(null);
            }}
            placeholder="Например, 7KQ4MX или Смирнова"
            autoCapitalize="characters"
            autoFocus={!cameraOn}
            state={lookup?.kind === 'notFound' ? 'error' : 'default'}
            onSubmitEditing={() => void find(query)}
          />

          {lookup?.kind === 'found' && lookup.bookings.length === 1 && dueAt !== null && (
            <FoundCard booking={lookup.bookings[0]} dueAt={dueAt} onDue={setDueAt} loanDays={loanDays} />
          )}
          {lookup?.kind === 'found' && lookup.bookings.length > 1 && dueAt !== null && (
            <View style={styles.multi}>
              <AppText variant="caption" tone="secondary" style={styles.multiHead}>
                У {declineName(lookup.bookings[0].user.fullName, 'gen')} {countWord(lookup.bookings.length)}{' '}
                {plural(lookup.bookings.length, ['бронь', 'брони', 'броней'])} — выберите, что выдать
              </AppText>
              {lookup.bookings.map((b) => (
                <CheckboxRow
                  key={b.id}
                  checked={selected.includes(b.id)}
                  onChange={(on) => setSelected((s) => (on ? [...s, b.id] : s.filter((x) => x !== b.id)))}
                  accessibilityLabel={b.book.title}
                >
                  <BookCover color={b.book.coverColor} uri={b.book.coverUri} width={28} height={40} lines={0} />
                  <View style={styles.flexShrink}>
                    <Text style={styles.bookTitle}>{b.book.title}</Text>
                    <AppText variant="caption" tone="secondary">
                      {b.fromQueue ? 'Из очереди, бронь' : 'Бронь'} до {dayMonthTime(b.pickupUntil ?? 0)}
                    </AppText>
                  </View>
                </CheckboxRow>
              ))}
              <AppText variant="caption" tone="secondary" style={styles.multiFoot}>
                Вернуть до {dayMonth(dueAt)} — {loanDays} {plural(loanDays, ['день', 'дня', 'дней'])} по умолчанию
              </AppText>
            </View>
          )}
          {lookup?.kind === 'found' && (
            <Button
              label={lookup.bookings.length > 1 ? `Выдать выбранные (${selected.length})` : 'Выдать'}
              variant="primary"
              block
              disabled={selected.length === 0}
              onPress={() => void issue()}
            />
          )}

          {lookup?.kind === 'notFound' && (
            <Notice
              tone="overdue"
              large
              text={`Бронь с кодом ${lookup.query} не найдена. Проверьте код или найдите по имени студента.`}
            />
          )}
          {lookup?.kind === 'expired' && (
            <Notice
              tone="neutral"
              large
              text={`Бронь ${lookup.booking.code} истекла ${dayMonth(lookup.booking.expiredAt ?? lookup.booking.pickupUntil ?? 0)}. Книга «${lookup.booking.book.title}» сейчас ${lookup.bookAvailable ? 'в наличии' : 'не в наличии'}.`}
              action={
                lookup.bookAvailable
                  ? { label: 'Выдать без брони', onPress: () => void issueExpired(), placement: 'below' }
                  : undefined
              }
            />
          )}
          {done && <Toast inline success text={done.text} />}
        </Panel>

        {/* ───── Сверка ───── */}
        <Panel
          title="Сверка"
          muted="обход"
          style={styles.half}
          actions={
            r ? (
              <AppText variant="caption" tone="neutral" style={styles.medium}>
                Сверено {r.done} из {r.total}
              </AppText>
            ) : undefined
          }
        >
          <ProgressBar value={r && r.total > 0 ? r.done / r.total : 1} />
          {r && r.groups.length === 0 ? (
            <EmptyState
              container="card"
              style={styles.allDone}
              visual={<StatusIcon icon="check" tone="available" size={64} />}
              title="Все записи сверены"
              text="Просрочек нет. Следующий обход — по расписанию библиотеки."
            />
          ) : (
            r?.groups.map((g) => (
              <View key={g.shelf} style={styles.group}>
                <Text style={styles.shelf}>{g.shelf.toLocaleUpperCase('ru-RU')}</Text>
                {g.items.map((it) => {
                  const female = isFemale(it.user.fullName);
                  const who =
                    it.status === 'awaiting_check' && it.returnMarkedAt
                      ? `${it.user.fullName} · ${female ? 'отметила' : 'отметил'} возврат ${numericDay(it.returnMarkedAt)}`
                      : `${it.user.fullName} · срок ${it.dueAt ? numericDay(it.dueAt) : '—'}`;
                  return (
                    <ReconciliationCard
                      key={it.id}
                      title={it.book.title}
                      who={who}
                      chip={JOURNAL_STATUS[it.status]}
                      overdue={it.status === 'overdue'}
                      onClose={async () => {
                        if (user) await closeOnShelf(it.id, user.id);
                        await recon.reload();
                      }}
                      onMissing={() => {
                        setComment('');
                        setMissing(it);
                      }}
                      onPostpone={async () => {
                        await postponeCheck(it.id);
                        await recon.reload();
                      }}
                    />
                  );
                })}
              </View>
            ))
          )}
        </Panel>
      </View>

      <Dialog
        desktop
        visible={!!missing}
        title={<TwoToneTitle text={`«${missing?.book.title ?? ''}»`} muted="не нашлась на полке" variant="title" />}
        text={
          missing
            ? `Запись вернётся в статус «Просрочено», книга пропадёт из наличия, ${declineName(missing.user.fullName, 'dat')} придёт уведомление.`
            : undefined
        }
        cancelLabel="Отмена"
        confirmLabel="Отметить расхождение"
        onCancel={() => setMissing(null)}
        onConfirm={async () => {
          const it = missing;
          setMissing(null);
          if (it && user) await markMissing(it.id, user.id, comment);
          await recon.reload();
        }}
      >
        <TextField
          size="md"
          label="Комментарий для журнала"
          value={comment}
          onChangeText={setComment}
          placeholder="Например: проверил стеллаж 3 и соседние полки"
          multiline
        />
      </Dialog>
    </ScrollView>
  );
}

function FoundCard({
  booking: b,
  dueAt,
  onDue,
  loanDays,
}: {
  booking: BookingWithBookAndUser;
  dueAt: number;
  onDue: (t: number) => void;
  loanDays: number;
}) {
  // Срок возврата не раньше сегодняшнего дня.
  const [today] = useState(() => Date.now());
  return (
    <View style={styles.found}>
      <View style={styles.foundHead}>
        <View style={styles.foundWho}>
          <Avatar initials={initials(b.user.fullName)} color={b.user.avatarColor} />
          <Text style={styles.foundName}>{[b.user.fullName, b.user.groupName].filter(Boolean).join(' · ')}</Text>
        </View>
        <StatusChip label="Ждёт выдачи" tone="busy" size="sm" />
      </View>
      <View style={styles.foundRow}>
        <AppText variant="caption" tone="secondary">
          Книга
        </AppText>
        <AppText variant="caption" style={[styles.medium, styles.flexShrink, styles.right]}>
          {b.book.title}
        </AppText>
      </View>
      <View style={styles.foundRow}>
        <AppText variant="caption" tone="secondary">
          Бронь до
        </AppText>
        <AppText variant="caption" style={styles.medium}>
          {dayMonthTime(b.pickupUntil ?? 0)}
        </AppText>
      </View>
      <View style={[styles.foundRow, styles.foundDue]}>
        <AppText variant="caption" tone="secondary">
          Вернуть до{' '}
          <Text style={styles.muted}>
            · {loanDays} {plural(loanDays, ['день', 'дня', 'дней'])} по умолчанию
          </Text>
        </AppText>
        <DateField value={dueAt} onChange={onDue} minimumDate={today} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flexShrink: { flexShrink: 1, minWidth: 0 },
  right: { textAlign: 'right' },
  medium: { fontFamily: fonts.medium },
  content: { paddingHorizontal: space[6], paddingBottom: space[6] },
  columns: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: space[4] },
  half: { flexGrow: 1, flexShrink: 1, flexBasis: 520, minWidth: 0 },
  found: { gap: space[1], paddingVertical: 14, paddingHorizontal: space[4], borderRadius: radius.xl, backgroundColor: colors.surface },
  foundHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2], paddingBottom: space[2] },
  foundWho: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  foundName: { ...typography.body, lineHeight: 20, fontFamily: fonts.semibold, color: colors.ink },
  foundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    minHeight: 36,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSunken,
  },
  foundDue: { minHeight: 48 },
  multi: { gap: space[2], padding: space[3], borderRadius: radius.xl, backgroundColor: colors.surface },
  multiHead: { paddingTop: 2, paddingHorizontal: space[1], paddingBottom: 6 },
  multiFoot: { padding: space[1] },
  bookTitle: { ...typography.label, fontFamily: fonts.semibold, color: colors.ink },
  group: { gap: space[2] },
  shelf: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.24, color: colors.inkSecondary, paddingHorizontal: space[2] },
  allDone: { paddingVertical: 64, gap: space[3] },
  muted: { color: colors.inkMuted },
});
