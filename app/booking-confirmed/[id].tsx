// S5 · Бронь оформлена. Варианты: обычная бронь, автобронь из очереди, срок выпал на выходные (+ загрузка, ошибка).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  BookCover,
  Button,
  EmptyState,
  Glass,
  Header,
  Notice,
  QRCard,
  ScreenBackground,
  Spinner,
  StatusChip,
  StatusIcon,
  TwoToneTitle,
} from '@/components';
import { getBooking, getSettings, isWeekend, previousWorkday } from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { dayMonth, weekdayGenDayMonthTime, weekdayLower } from '@/lib/format';
import { colors, fonts, space, typography, ui } from '@/theme/tokens';

export default function BookingConfirmedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const q = useQuery(async () => {
    const [booking, settings] = await Promise.all([getBooking(bookingId), getSettings()]);
    return { booking, settings };
  }, [bookingId]);

  const close = () => router.dismissTo('/search');
  const booking = q.data?.booking;
  const settings = q.data?.settings;

  if (q.status !== 'ready' || !booking || !settings || !booking.pickupUntil) {
    return (
      <ScreenBackground variant="success">
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>
            <Header variant="success" badge="Бронь оформлена" closeLabel="Закрыть и вернуться к поиску" onClose={close} />
          </View>
          <View style={styles.main}>
            {q.status === 'loading' ? (
              <View style={styles.loading} accessibilityLabel="Загрузка">
                <Spinner />
              </View>
            ) : (
              <EmptyState
                visual={<StatusIcon icon="refresh" tone="busy" />}
                title="Не удалось загрузить данные"
                text="Проверьте подключение и попробуйте ещё раз."
                actions={<Button label="Повторить" variant="secondary" block onPress={() => void q.reload({ showLoading: true })} />}
              />
            )}
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const pickup = booking.pickupUntil;
  const weekend = isWeekend(pickup);
  const lastDay = previousWorkday(pickup);
  const { user } = booking;
  const channels =
    user.telegram && user.telegramEnabled
      ? `${user.email} и в Telegram @${user.telegram}`
      : user.email;

  return (
    <ScreenBackground variant="success">
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Header
              variant="success"
              badge={booking.fromQueue ? 'Очередь дошла до вас' : 'Бронь оформлена'}
              closeLabel="Закрыть и вернуться к поиску"
              onClose={close}
            />
          </View>

          <View style={styles.main}>
            <TwoToneTitle
              parts={[
                { text: booking.fromQueue ? 'Книга освободилась и ждёт вас' : 'Книга ждёт вас', muted: true },
                { text: `\nдо ${weekdayGenDayMonthTime(pickup)}` },
              ]}
              style={styles.title}
            />

            {weekend && (
              <Notice
                tone="busy"
                text={`Библиотека закрыта в субботу и воскресенье. Последний шанс забрать — ${weekdayLower(lastDay)}, ${dayMonth(lastDay)}, до ${settings.closingTime}.`}
              />
            )}

            <Glass style={styles.details}>
              <View style={styles.book}>
                <BookCover color={booking.book.coverColor} uri={booking.book.coverUri} size="md" />
                <View style={styles.bookBody}>
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {booking.book.title}
                  </Text>
                  <AppText variant="caption" tone="secondary">
                    {booking.book.authorsShort}
                  </AppText>
                  <View style={styles.chip}>
                    <StatusChip label="Ждёт вас" tone="busy" />
                  </View>
                </View>
              </View>
              <View style={styles.line}>
                <AppText variant="label" tone="secondary" style={styles.regular}>
                  Где
                </AppText>
                <AppText variant="label">{settings.location}</AppText>
              </View>
              <View style={styles.line}>
                <AppText variant="label" tone="secondary" style={styles.regular}>
                  Часы работы
                </AppText>
                <AppText variant="label">{settings.hours}</AppText>
              </View>
              <View style={styles.buttons}>
                <Button label="Мои брони" variant="dark" onPress={() => router.dismissTo('/bookings')} style={styles.flex12} />
                <Button label="Найти ещё" variant="secondary" onPress={close} style={styles.flex} />
              </View>
            </Glass>

            <QRCard code={booking.code} />

            <AppText variant="caption" tone="secondary" style={styles.sent}>
              Подтверждение отправлено на {channels}.
            </AppText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex12: { flex: 1.2 },
  regular: { fontFamily: fonts.regular },
  scroll: { flexGrow: 1 },
  header: { padding: space[4] },
  main: { flex: 1, gap: space[3], paddingHorizontal: space[4], paddingBottom: space[4] },
  loading: { paddingTop: space[8], alignItems: 'center' },
  title: { marginVertical: space[1], marginHorizontal: space[2] },
  details: { gap: space[1], paddingTop: space[3], paddingHorizontal: space[4], paddingBottom: space[4] },
  book: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingBottom: space[2] },
  bookBody: { flex: 1, minWidth: 0, gap: 2 },
  bookTitle: { ...typography.bodyStrong, color: colors.ink },
  chip: { marginTop: space[1] },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    borderTopWidth: 1,
    borderTopColor: ui.panelDivider,
  },
  buttons: { flexDirection: 'row', gap: space[2], paddingTop: space[2] },
  sent: { paddingHorizontal: space[2] },
});
