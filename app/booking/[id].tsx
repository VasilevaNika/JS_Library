// S9 · Бронь (детали). Состояния: ждёт выдачи (QR), выдана, только что выдана, бронь снята
// (+ просрочена, завершённые, загрузка, ошибка — собраны из тех же блоков, Q6).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  BookSummaryCard,
  Button,
  Dialog,
  EmptyState,
  Header,
  Icon,
  InfoList,
  QRCard,
  ReturnSheet,
  ScreenBackground,
  Spinner,
  StatusIcon,
} from '@/components';
import { cancelBooking, getBooking, getSettings, markReturned, type BookingWithBookAndUser } from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { useSession } from '@/hooks/useSession';
import { dayMonth, dayMonthTime } from '@/lib/format';
import { colors, fonts, radius, shadows, space, status, typography, type StatusTone } from '@/theme/tokens';

/** «Только что» — выдача за последние 10 минут или смена статуса, пока экран открыт. */
const JUST_ISSUED_MS = 10 * 60 * 1000;

type StateCard = {
  tone: 'white' | 'available' | 'neutral' | 'overdue';
  icon: 'check' | 'clock';
  eyebrow: string;
  title: string;
  text: string;
};

export default function BookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);
  const { user } = useSession();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const lastStatus = useRef<string | null>(null);

  const q = useQuery(async () => {
    const [booking, settings] = await Promise.all([getBooking(bookingId), getSettings()]);
    const prev = lastStatus.current;
    lastStatus.current = booking?.status ?? null;
    const justIssued =
      booking?.status === 'issued' &&
      (prev === 'reserved' || (booking.issuedAt !== null && Date.now() - booking.issuedAt < JUST_ISSUED_MS));
    return { booking, settings, justIssued };
  }, [bookingId]);

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/bookings'));
  const header = <Header variant="back" title="Бронь" backLabel="Назад к броням" onBack={back} />;

  const b = q.data?.booking;
  const settings = q.data?.settings;

  if (q.status !== 'ready' || !b || !settings) {
    return (
      <ScreenBackground variant="details">
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>{header}</View>
          <View style={styles.main}>
            {q.status === 'loading' ? (
              <View style={styles.loading} accessibilityLabel="Загрузка">
                <Spinner />
              </View>
            ) : (
              <EmptyState
                visual={<StatusIcon icon="refresh" tone="busy" />}
                title={q.status === 'ready' ? 'Бронь не найдена' : 'Не удалось загрузить данные'}
                text="Проверьте подключение и попробуйте ещё раз."
                actions={<Button label="Повторить" variant="secondary" block onPress={() => void q.reload({ showLoading: true })} />}
              />
            )}
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const { chip, card, row1 } = describe(b, !!q.data?.justIssued, settings.pickupHours);

  return (
    <ScreenBackground variant="details">
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>{header}</View>
          <View style={[styles.main, { paddingBottom: space[6] + insets.bottom }]}>
            <BookSummaryCard
              book={{ title: b.book.title, color: b.book.coverColor, coverUri: b.book.coverUri }}
              author={b.book.authorsShort}
              chip={chip}
              coverSize="md"
              onPress={() => router.push(`/book/${b.bookId}`)}
            />

            {b.status === 'reserved' ? <QRCard code={b.code} layout="center" /> : card && <StateCardView card={card} />}

            <InfoList
              compact
              items={[
                row1,
                { label: 'Где', value: settings.location },
                { label: 'Часы работы', value: settings.hours },
              ]}
            />

            <View style={styles.actions}>
              {b.status === 'reserved' && (
                <Button label="Отменить бронь" variant="danger" block onPress={() => setCancelOpen(true)} />
              )}
              {(b.status === 'issued' || b.status === 'overdue') && (
                <Button label="Я вернул книгу" variant="dark" block onPress={() => setReturnOpen(true)} />
              )}
              {(b.status === 'expired' || b.status === 'cancelled') && (
                <Button label="Забронировать снова" variant="dark" block onPress={() => router.push(`/book/${b.bookId}`)} />
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Dialog
        visible={cancelOpen}
        title={`Отменить бронь на «${b.book.title}»?`}
        text="Книга сразу станет доступна другим."
        cancelLabel="Оставить"
        confirmLabel="Отменить бронь"
        onCancel={() => setCancelOpen(false)}
        onConfirm={async () => {
          setCancelOpen(false);
          if (user) await cancelBooking(b.id, user.id);
          back();
        }}
      />
      <ReturnSheet
        visible={returnOpen}
        title={b.book.title}
        cover={b.book.coverColor}
        overdueText={b.status === 'overdue' && b.dueAt ? `Срок возврата прошёл ${dayMonth(b.dueAt)}.` : undefined}
        onClose={() => setReturnOpen(false)}
        onConfirm={async () => {
          setReturnOpen(false);
          if (user) await markReturned(b.id, user.id);
          await q.reload();
        }}
      />
    </ScreenBackground>
  );
}

function describe(b: BookingWithBookAndUser, justIssued: boolean, pickupHours: number) {
  const pickup = b.pickupUntil ? dayMonthTime(b.pickupUntil) : '—';
  const due = b.dueAt ? dayMonth(b.dueAt) : '—';
  let chip: { label: string; tone: StatusTone };
  let card: StateCard | null = null;
  let row1 = { label: 'Вернуть до', value: due };
  switch (b.status) {
    case 'reserved':
      chip = { label: 'Ждёт вас', tone: 'busy' };
      row1 = { label: 'Забрать до', value: pickup };
      break;
    case 'issued':
      chip = { label: 'Выдана', tone: 'busy' };
      card = justIssued
        ? {
            tone: 'available',
            icon: 'check',
            eyebrow: 'Только что',
            title: `Книга выдана. Вернуть до ${due}`,
            text: 'Модератор подтвердил выдачу. Напоминание придёт за день до срока.',
          }
        : {
            tone: 'white',
            icon: 'clock',
            eyebrow: 'Книга у вас',
            title: `Вернуть до ${due}`,
            text: `Выдана ${b.issuedAt ? dayMonth(b.issuedAt) : '—'}. Положите книгу на полку и отметьте возврат здесь.`,
          };
      break;
    case 'overdue':
      chip = { label: 'Просрочено', tone: 'overdue' };
      card = {
        tone: 'overdue',
        icon: 'clock',
        eyebrow: 'Книга у вас',
        title: `Срок возврата прошёл ${due}`,
        text: 'Если книга уже на полке, отметьте возврат',
      };
      break;
    case 'expired':
      chip = { label: 'Истекла', tone: 'neutral' };
      row1 = { label: 'Бронь была до', value: pickup };
      card = {
        tone: 'neutral',
        icon: 'clock',
        eyebrow: pickup,
        title: `Бронь снята — книгу не забрали за ${pickupHours} часов`,
        text: 'Книга снова в каталоге. Её можно забронировать ещё раз.',
      };
      break;
    case 'awaiting_check':
      chip = { label: 'Ожидает сверки', tone: 'neutral' };
      card = {
        tone: 'neutral',
        icon: 'check',
        eyebrow: b.returnMarkedAt ? dayMonth(b.returnMarkedAt) : '',
        title: 'Ожидает сверки',
        text: `Вы отметили возврат ${b.returnMarkedAt ? dayMonth(b.returnMarkedAt) : ''}. Библиотека проверит полку`,
      };
      break;
    case 'closed':
      chip = { label: 'Закрыта', tone: 'neutral' };
      card = {
        tone: 'neutral',
        icon: 'check',
        eyebrow: b.closedAt ? dayMonth(b.closedAt) : '',
        title: 'Закрыта',
        text: `Возвращена ${b.closedAt ? dayMonth(b.closedAt) : ''}`,
      };
      break;
    case 'cancelled':
      chip = { label: 'Отменена', tone: 'neutral' };
      row1 = { label: 'Бронь была до', value: pickup };
      card = {
        tone: 'neutral',
        icon: 'clock',
        eyebrow: b.cancelledAt ? dayMonth(b.cancelledAt) : '',
        title: 'Отменена',
        text: `Вы отменили бронь ${b.cancelledAt ? dayMonth(b.cancelledAt) : ''}`,
      };
      break;
  }
  return { chip, card, row1 };
}

const CARD_TONE: Record<StateCard['tone'], { bg: string; fg: string }> = {
  white: { bg: colors.surface, fg: status.busy.fg },
  available: { bg: status.available.bg, fg: status.available.fg },
  neutral: { bg: status.neutral.bg, fg: status.neutral.fg },
  overdue: { bg: status.overdue.bg, fg: status.overdue.fg },
};

function StateCardView({ card }: { card: StateCard }) {
  const t = CARD_TONE[card.tone];
  return (
    <View accessibilityRole="summary" style={[styles.card, { backgroundColor: t.bg }]}>
      <View style={styles.cardIcon}>
        <Icon name={card.icon} size={26} color={t.fg} />
      </View>
      <Text style={[styles.eyebrow, { color: t.fg }]}>{card.eyebrow}</Text>
      <AppText variant="title" align="center">
        {card.title}
      </AppText>
      <AppText variant="caption" tone="secondary" align="center">
        {card.text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: { padding: space[4] },
  main: { flex: 1, gap: space[4], paddingHorizontal: space[4], paddingBottom: space[6] },
  loading: { paddingTop: space[8], alignItems: 'center' },
  actions: { marginTop: 'auto', gap: space[2] },
  card: {
    alignItems: 'center',
    gap: space[3],
    paddingVertical: 28,
    paddingHorizontal: space[5],
    borderRadius: radius['2xl'],
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    boxShadow: shadows.iconCircle,
  },
  eyebrow: { ...typography.caption, fontFamily: fonts.medium },
});
