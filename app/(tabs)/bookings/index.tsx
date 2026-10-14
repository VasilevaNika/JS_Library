// S8 · Мои брони. Состояния: список, гость, пусто, загрузка, ошибка.
// Оверлеи: отмена брони, выход из очереди, подтверждение возврата (обычное и после просрочки).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BookingCard,
  Button,
  Dialog,
  EmptyState,
  Glass,
  Header,
  LoadError,
  ReturnSheet,
  ScreenBackground,
  ShelfIllustration,
  SkeletonBookingCard,
  SkeletonPanel,
  SkeletonStats,
  StatBlock,
  StatusIcon,
  TwoToneTitle,
} from '@/components';
import {
  cancelBooking,
  getDevFlag,
  getMyBookings,
  getSettings,
  leaveQueue,
  markReturned,
  type BookingWithBook,
  type MyBookingItem,
} from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { useSession } from '@/hooks/useSession';
import { dayMonth, dayMonthTime } from '@/lib/format';
import { space, type StatusTone } from '@/theme/tokens';

type Card = {
  key: string;
  title: string;
  cover: BookingWithBook['book']['coverColor'];
  coverUri: string | null;
  meta: string;
  overdue?: boolean;
  chip: { label: string; tone: StatusTone };
  action?: { label: string; a11y?: string; onPress: () => void };
  onPress: () => void;
};

export default function MyBookingsScreen() {
  const router = useRouter();
  const { returnId } = useLocalSearchParams<{ returnId?: string }>();
  const { user } = useSession();
  const userId = user?.id ?? null;

  const [cancelTarget, setCancelTarget] = useState<BookingWithBook | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<{ bookId: number; title: string; position: number } | null>(null);
  const [returnTarget, setReturnTarget] = useState<BookingWithBook | null>(null);
  const [openedReturnId, setOpenedReturnId] = useState<string | null>(null);

  const q = useQuery(async () => {
    if (userId === null) return null;
    if (await getDevFlag('loadError')) throw new Error('dev: loadError');
    const [mine, settings] = await Promise.all([getMyBookings(userId), getSettings()]);
    return { mine, settings };
  }, [userId]);

  // Переход с баннера «Срок возврата прошёл» на главной — сразу открыть подтверждение возврата.
  if (returnId && returnId !== openedReturnId && q.data) {
    const target = q.data.mine.active.find((i) => i.kind === 'booking' && String(i.booking.id) === returnId);
    setOpenedReturnId(returnId);
    if (target?.kind === 'booking') setReturnTarget(target.booking);
  }

  const cardOf = (item: MyBookingItem): Card => {
    if (item.kind === 'queue') {
      return {
        key: `q${item.book.id}`,
        title: item.book.title,
        cover: item.book.coverColor,
        coverUri: item.book.coverUri,
        meta: `Вы ${item.position}-й в очереди`,
        chip: { label: 'В очереди', tone: 'neutral' },
        action: {
          label: 'Выйти',
          a11y: 'Выйти из очереди',
          onPress: () => setLeaveTarget({ bookId: item.book.id, title: item.book.title, position: item.position }),
        },
        onPress: () => router.push(`/book/${item.book.id}`),
      };
    }
    const b = item.booking;
    const base = { key: `b${b.id}`, title: b.book.title, cover: b.book.coverColor, coverUri: b.book.coverUri };
    const details = () => router.push(`/booking/${b.id}`);
    const toBook = () => router.push(`/book/${b.bookId}`);
    switch (b.status) {
      case 'reserved':
        return {
          ...base,
          meta: `Заберите до ${dayMonthTime(b.pickupUntil ?? 0)}`,
          chip: { label: 'Ждёт вас', tone: 'busy' },
          action: { label: 'Отменить', a11y: 'Отменить бронь', onPress: () => setCancelTarget(b) },
          onPress: details,
        };
      case 'issued':
        return {
          ...base,
          meta: `Вернуть до ${dayMonth(b.dueAt ?? 0)}`,
          chip: { label: 'Выдана', tone: 'busy' },
          action: { label: 'Я вернул книгу', onPress: () => setReturnTarget(b) },
          onPress: details,
        };
      case 'overdue':
        return {
          ...base,
          meta: `Срок возврата прошёл ${dayMonth(b.dueAt ?? 0)}`,
          overdue: true,
          chip: { label: 'Просрочено', tone: 'overdue' },
          action: { label: 'Я вернул книгу', onPress: () => setReturnTarget(b) },
          onPress: details,
        };
      case 'awaiting_check':
        return {
          ...base,
          meta: `Вы отметили возврат ${dayMonth(b.returnMarkedAt ?? 0)}. Библиотека проверит полку`,
          chip: { label: 'Ожидает сверки', tone: 'neutral' },
          onPress: toBook,
        };
      case 'closed':
        return {
          ...base,
          meta: `Возвращена ${dayMonth(b.closedAt ?? 0)}`,
          chip: { label: 'Закрыта', tone: 'neutral' },
          onPress: toBook,
        };
      case 'expired':
        return {
          ...base,
          meta: `Бронь снята ${dayMonth(b.expiredAt ?? 0)} — книгу не забрали за ${q.data?.settings.pickupHours ?? 48} часов`,
          chip: { label: 'Истекла', tone: 'neutral' },
          action: { label: 'Забронировать снова', onPress: toBook },
          onPress: toBook,
        };
      case 'cancelled':
        return {
          ...base,
          meta: `Вы отменили бронь ${dayMonth(b.cancelledAt ?? 0)}`,
          chip: { label: 'Отменена', tone: 'neutral' },
          action: { label: 'Забронировать снова', onPress: toBook },
          onPress: toBook,
        };
    }
  };

  const renderCard = (c: Card) => (
    <BookingCard
      key={c.key}
      book={{ title: c.title, color: c.cover, coverUri: c.coverUri }}
      meta={c.meta}
      metaTone={c.overdue ? 'overdue' : 'secondary'}
      chip={c.chip}
      overdue={c.overdue}
      onPress={c.onPress}
      action={
        c.action ? (
          <Button label={c.action.label} accessibilityLabel={c.action.a11y} variant="tertiary" size="md" onPress={c.action.onPress} />
        ) : undefined
      }
    />
  );

  const data = q.data;
  const mine = data?.mine;
  const isGuest = user === null;
  const loading = user === undefined || (!isGuest && q.status === 'loading');
  const empty = mine && mine.active.length === 0 && mine.completed.length === 0;

  let body;
  if (isGuest) {
    body = (
      <EmptyState
        visual={<StatusIcon icon="bookmark" tone="white" />}
        title="Войдите, чтобы видеть свои брони"
        text="Брони, очередь и сроки возврата — в одном списке."
        actions={<Button label="Войти" variant="dark" block onPress={() => router.push('/login')} />}
      />
    );
  } else if (q.status === 'error' && !data) {
    body = (
      <LoadError title="Не удалось загрузить брони" onRetry={() => void q.reload({ showLoading: true })} />
    );
  } else if (loading || !mine) {
    body = (
      <View style={styles.list} accessibilityLabel="Загрузка">
        <SkeletonStats />
        <SkeletonPanel style={styles.skPanel}>
          <SkeletonBookingCard titleWidth="70%" />
          <SkeletonBookingCard titleWidth="55%" />
          <SkeletonBookingCard titleWidth="64%" />
        </SkeletonPanel>
      </View>
    );
  } else if (empty) {
    body = (
      <EmptyState
        style={styles.emptyCard}
        visual={<ShelfIllustration variant="noBookings" label="Почти пустая полка" />}
        title="У вас пока нет броней"
        text={`Найдите книгу и забронируйте её — она будет ждать вас ${data?.settings.pickupHours ?? 48} часов.`}
        actions={<Button label="Найти книгу" variant="dark" onPress={() => router.navigate('/search')} style={styles.center} />}
      />
    );
  } else {
    body = (
      <>
        <StatBlock
          secondFlex={1.4}
          items={[
            { label: 'Активные', value: mine.counts.active },
            { label: 'Просрочено', value: mine.counts.overdue, tone: mine.counts.overdue > 0 ? 'overdue' : undefined },
            { label: 'Завершённые', value: mine.counts.completed },
          ]}
        />
        {mine.active.length > 0 && (
          <Glass style={styles.section}>
            <TwoToneTitle text="Активные" muted="· по ближайшему сроку" variant="headline" style={styles.indent} />
            <View style={styles.cards}>{mine.active.map((i) => renderCard(cardOf(i)))}</View>
          </Glass>
        )}
        {mine.completed.length > 0 && (
          <Glass style={styles.section}>
            <TwoToneTitle text="Завершённые" muted="· за 30 дней" variant="headline" style={styles.indent} />
            <View style={styles.cards}>
              {mine.completed.map((b) => renderCard(cardOf({ kind: 'booking', booking: b })))}
            </View>
          </Glass>
        )}
      </>
    );
  }

  return (
    <ScreenBackground variant="bookings">
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header
            variant="brand"
            onBrandPress={() => router.navigate('/search')}
            action={{ icon: 'menu', label: 'Меню', onPress: () => router.push('/menu') }}
          />
          <TwoToneTitle text="Мои" muted="брони" style={styles.title} />
          {body}
        </ScrollView>
      </SafeAreaView>

      <Dialog
        visible={!!cancelTarget}
        title={`Отменить бронь на «${cancelTarget?.book.title ?? ''}»?`}
        text="Книга сразу станет доступна другим."
        cancelLabel="Оставить"
        confirmLabel="Отменить бронь"
        onCancel={() => setCancelTarget(null)}
        onConfirm={async () => {
          const t = cancelTarget;
          setCancelTarget(null);
          if (t && user) await cancelBooking(t.id, user.id);
          await q.reload();
        }}
      />
      <Dialog
        visible={!!leaveTarget}
        title={`Выйти из очереди за «${leaveTarget?.title ?? ''}»?`}
        text={`Сейчас вы ${leaveTarget?.position ?? 1}-й. Если вернётесь позже, встанете в конец очереди.`}
        cancelLabel="Остаться"
        confirmLabel="Выйти"
        onCancel={() => setLeaveTarget(null)}
        onConfirm={async () => {
          const t = leaveTarget;
          setLeaveTarget(null);
          if (t && user) await leaveQueue(user.id, t.bookId);
          await q.reload();
        }}
      />
      {returnTarget && (
        <ReturnSheet
          visible
          title={returnTarget.book.title}
          cover={returnTarget.book.coverColor}
          overdueText={
            returnTarget.status === 'overdue' && returnTarget.dueAt
              ? `Срок возврата прошёл ${dayMonth(returnTarget.dueAt)}.`
              : undefined
          }
          onClose={() => setReturnTarget(null)}
          onConfirm={async () => {
            const t = returnTarget;
            setReturnTarget(null);
            if (user) await markReturned(t.id, user.id);
            await q.reload();
          }}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
  content: { padding: space[4], paddingBottom: 120, gap: space[4] },
  title: { marginHorizontal: space[2] },
  section: { gap: space[3], paddingTop: space[4], paddingHorizontal: space[3], paddingBottom: space[3] },
  indent: { paddingHorizontal: space[2] },
  cards: { gap: space[2] },
  list: { gap: space[4] },
  skPanel: { gap: space[2] },
  emptyCard: { gap: space[5], paddingTop: space[3], paddingHorizontal: space[3], paddingBottom: space[6] },
});
