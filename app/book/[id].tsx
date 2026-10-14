// S4 · Карточка книги. Состояния: available, creating, mine, limit, race, reserved, issued, overdueOther,
// inQueue, withMe, error (+ загрузка, «книга не найдена»). Оверлеи: шторка очереди, выход из очереди, возврат.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Bone,
  BookCover,
  Button,
  Dialog,
  EmptyState,
  Header,
  InfoList,
  LoadError,
  Notice,
  QueueSheet,
  ReturnSheet,
  ScreenBackground,
  StatBlock,
  StatusChip,
  StatusIcon,
  Toast,
  TwoToneTitle,
} from '@/components';
import {
  type BookCardState,
  bookStateNotice,
  createBooking,
  getBookCard,
  getDevFlag,
  getSettings,
  joinQueue,
  leaveQueue,
  markReturned,
} from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { useSession } from '@/hooks/useSession';
import { coverAuthors, dayMonth, splitBookTitle } from '@/lib/format';
import { colors, radius, shadows, space, type StatusTone } from '@/theme/tokens';

type ScreenState = BookCardState | 'race' | 'creating' | 'error';

const CHIP: Record<ScreenState, { label: string; tone: StatusTone }> = {
  available: { label: 'В наличии', tone: 'available' },
  creating: { label: 'В наличии', tone: 'available' },
  limit: { label: 'В наличии', tone: 'available' },
  error: { label: 'В наличии', tone: 'available' },
  mine: { label: 'Ваша бронь', tone: 'busy' },
  race: { label: 'Занята', tone: 'busy' },
  reserved: { label: 'Занята', tone: 'busy' },
  inQueue: { label: 'Занята', tone: 'busy' },
  issued: { label: 'Выдана', tone: 'busy' },
  overdueOther: { label: 'Выдана', tone: 'busy' },
  withMe: { label: 'Выдана вам', tone: 'busy' },
};

export default function BookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, race } = useLocalSearchParams<{ id: string; race?: string }>();
  const bookId = Number(id);
  const { user } = useSession();
  const userId = user?.id ?? null;

  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lostRace, setLostRace] = useState(false);
  const [queueSheet, setQueueSheet] = useState<number | null>(null);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [returnSheet, setReturnSheet] = useState(false);

  const card = useQuery(async () => {
    const [data, settings, raceFlag] = await Promise.all([getBookCard(bookId, userId), getSettings(), getDevFlag('race')]);
    return { data, settings, raceFlag };
  }, [bookId, userId]);

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/search'));

  const loaded = card.data;
  const book = loaded?.data?.book;
  const settings = loaded?.settings;

  let state: ScreenState | null = loaded?.data?.state ?? null;
  if (state === 'available' && (lostRace || race === '1' || loaded?.raceFlag)) state = 'race';
  if (state === 'available' && creating) state = 'creating';
  if (state === 'available' && failed) state = 'error';

  const reserve = async () => {
    if (!user) {
      router.push({ pathname: '/login', params: { bookId: String(bookId) } });
      return;
    }
    setFailed(false);
    setCreating(true);
    try {
      if (await getDevFlag('bookingError')) throw new Error('dev: bookingError');
      const res = await createBooking(user.id, bookId);
      if (res.ok) {
        router.replace(`/booking-confirmed/${res.bookingId}`);
        return;
      }
      if (res.error === 'unavailable') setLostRace(true);
      await card.reload();
    } catch {
      setFailed(true);
    } finally {
      setCreating(false);
    }
  };

  const queue = async () => {
    if (!user) {
      router.push({ pathname: '/login', params: { bookId: String(bookId) } });
      return;
    }
    const position = await joinQueue(user.id, bookId);
    await card.reload();
    setQueueSheet(position);
  };

  if (card.status === 'loading' || (card.status === 'ready' && !loaded?.data)) {
    const missing = card.status === 'ready';
    return (
      <ScreenBackground variant="book">
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>
            <Header variant="book" backLabel="Назад к результатам" onBack={back} />
          </View>
          {missing ? (
            <View style={styles.missing}>
              <EmptyState
                visual={<StatusIcon icon="bookOpen" tone="sunken" />}
                title="Книга не найдена"
                text="Возможно, её убрали из каталога."
                actions={<Button label="Найти книгу" variant="dark" onPress={() => router.navigate('/search')} style={styles.center} />}
              />
            </View>
          ) : (
            <View accessibilityLabel="Загрузка" style={styles.skeleton}>
              <View style={styles.skHero}>
                <View style={styles.skHeroText}>
                  <Bone kind="glass" width={110} height={36} />
                  <Bone width="90%" height={28} r={8} />
                  <Bone width="60%" height={28} r={8} />
                  <Bone width="50%" height={14} />
                </View>
                <Bone kind="block" width={152} height={216} r={12} />
              </View>
            </View>
          )}
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (card.status === 'error' || !book || !state || !settings || !loaded?.data) {
    return (
      <ScreenBackground variant="book">
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>
            <Header variant="book" backLabel="Назад к результатам" onBack={back} />
          </View>
          <View style={styles.missing}>
            <LoadError onRetry={() => void card.reload({ showLoading: true })} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const data = loaded.data;
  const mine = data.myBooking;
  const [coverTitle, coverSubtitle] = splitBookTitle(book.title);
  const free = book.availability.onShelf > 0 && ['available', 'creating', 'limit', 'mine', 'error'].includes(state);

  const notice = bookStateNotice(data, settings, state === 'race');

  return (
    <ScreenBackground variant="book">
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
          <View style={styles.header}>
            <Header variant="book" backLabel="Назад к результатам" onBack={back} />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroText}>
              <StatusChip label={CHIP[state].label} tone={CHIP[state].tone} size="lg" />
              <View style={styles.heroTitle}>
                <TwoToneTitle text={book.title} variant="titleLg" />
                <AppText tone="neutral" style={styles.author}>
                  {book.authorsShort}
                </AppText>
              </View>
            </View>
            <BookCover
              color={book.coverColor}
              uri={book.coverUri}
              size="lg"
              height={216}
              title={coverTitle}
              subtitle={coverSubtitle}
              authors={coverAuthors(book.authorsFull)}
              accessibilityLabel={`Обложка книги «${book.title}»`}
            />
          </View>

          <View style={[styles.panel, { paddingBottom: space[6] + insets.bottom }]}>
            <View style={styles.block}>
              <View style={styles.availability}>
                <AppText variant="headline">Наличие</AppText>
                <AppText variant="caption" tone="secondary">
                  {settings.location}
                </AppText>
              </View>
              <StatBlock
                items={[
                  { label: 'На полке', value: book.availability.onShelf, tone: free ? 'available' : undefined },
                  { label: 'Выдано', value: book.availability.issued },
                  { label: 'Очередь', value: book.availability.queue },
                ]}
              />
            </View>

            <InfoList
              compact
              items={[
                { label: 'Авторы', value: book.authorsInfo, icon: 'user' },
                { label: 'Год', value: book.year ? String(book.year) : '—', icon: 'calendar', tabular: true },
                { label: 'ISBN', value: book.isbn ?? '—', icon: 'barcode', tabular: true },
              ]}
            />

            <View style={styles.actions}>
              {notice && (
                <Notice
                  tone={notice.tone}
                  text={notice.text}
                  link={notice.showBookingsLink ? { label: 'Открыть «Мои брони»', onPress: () => router.navigate('/bookings') } : undefined}
                />
              )}
              {(state === 'available' || state === 'creating' || state === 'error') && (
                <AppText variant="caption" tone="secondary" align="center">
                  Бронь действует {settings.pickupHours} часов. Забрать можно в часы работы: {settings.hours}.
                </AppText>
              )}
              {(state === 'available' || state === 'error' || state === 'creating') && (
                <Button
                  label={state === 'creating' ? 'Бронируем…' : 'Забронировать'}
                  variant="primary"
                  icon="bookmarkPlus"
                  loading={state === 'creating'}
                  block
                  onPress={() => void reserve()}
                />
              )}
              {state === 'limit' && <Button label="Забронировать" variant="primary" disabled block />}
              {(state === 'race' || state === 'reserved' || state === 'issued' || state === 'overdueOther') && (
                <Button label="Встать в очередь" variant="secondary" icon="clock" block onPress={() => void queue()} />
              )}
              {state === 'inQueue' && (
                <Button label="Выйти из очереди" variant="secondary" block onPress={() => setLeaveDialog(true)} />
              )}
              {state === 'mine' && mine && (
                <Button label="Показать QR-код" variant="dark" block onPress={() => router.push(`/booking/${mine.id}`)} />
              )}
              {state === 'withMe' && <Button label="Я вернул книгу" variant="dark" block onPress={() => setReturnSheet(true)} />}
            </View>
          </View>
        </ScrollView>

        {state === 'error' && (
          <Toast
            text="Не удалось создать бронь. Книга по-прежнему в наличии — попробуйте ещё раз."
            actionLabel="Повторить"
            onAction={() => void reserve()}
            bottom={96 + insets.bottom}
          />
        )}

        <QueueSheet
          visible={queueSheet !== null}
          position={queueSheet ?? 1}
          title={book.title}
          author={book.authorsShort}
          cover={book.coverColor}
          holdHours={settings.queueHoldHours}
          onClose={() => setQueueSheet(null)}
          onMyBookings={() => {
            setQueueSheet(null);
            router.navigate('/bookings');
          }}
        />
        <Dialog
          visible={leaveDialog}
          title={`Выйти из очереди за «${book.title}»?`}
          text={`Сейчас вы ${data.queuePosition ?? 1}-й. Если вернётесь позже, встанете в конец очереди.`}
          cancelLabel="Остаться"
          confirmLabel="Выйти"
          onCancel={() => setLeaveDialog(false)}
          onConfirm={async () => {
            setLeaveDialog(false);
            if (user) await leaveQueue(user.id, bookId);
            await card.reload();
          }}
        />
        {mine && (
          <ReturnSheet
            visible={returnSheet}
            title={book.title}
            cover={book.coverColor}
            overdueText={mine.status === 'overdue' && mine.dueAt ? `Срок возврата прошёл ${dayMonth(mine.dueAt)}.` : undefined}
            onClose={() => setReturnSheet(false)}
            onConfirm={async () => {
              setReturnSheet(false);
              if (user) await markReturned(mine.id, user.id);
              router.navigate('/bookings');
            }}
          />
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
  scroll: { flexGrow: 1 },
  header: { padding: space[4] },
  hero: { flexDirection: 'row', gap: space[3], paddingLeft: space[6], paddingRight: space[4], minHeight: 236 },
  heroText: { flex: 1, minWidth: 0, gap: space[4], paddingTop: space[2] },
  heroTitle: { gap: space[2] },
  author: { lineHeight: 20 },
  panel: {
    flex: 1,
    gap: space[4],
    marginTop: space[4],
    paddingTop: space[5],
    paddingHorizontal: space[4],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.glassStrong,
    borderTopWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.bookPanel,
  },
  block: { gap: space[3] },
  availability: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space[2] },
  actions: { marginTop: 'auto', gap: space[3] },
  missing: { padding: space[4] },
  skeleton: { padding: space[4] },
  skHero: { flexDirection: 'row', gap: space[3], paddingLeft: space[2] },
  skHeroText: { flex: 1, gap: space[4], paddingTop: space[2] },
});
