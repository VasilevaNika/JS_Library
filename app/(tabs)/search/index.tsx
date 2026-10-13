// S1 · Главная. Состояния: guest, booking, issued, overdue, queue, loading, catalogEmpty (+ ошибка загрузки).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Bone,
  BookingBanner,
  BookTile,
  Button,
  EmptyState,
  Glass,
  Header,
  ScreenBackground,
  SearchField,
  ShelfIllustration,
  StatusIcon,
  TextLink,
  TopicChip,
  TwoToneTitle,
  type BannerTone,
} from '@/components';
import {
  countBooks,
  getDevFlag,
  getHomeSummary,
  getSettings,
  recentlyReturned,
  type BookingWithBook,
} from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { useSession } from '@/hooks/useSession';
import { dayMonth, dayMonthTime, plural } from '@/lib/format';
import { fonts, radius, space, ui } from '@/theme/tokens';

/** Темы из макета — подписи интерфейса; нажатие ищет книги по теме. */
const TOPICS = ['Математика', 'Программирование', 'Физика', 'Экономика'];

type Banner = { tone: BannerTone; title: string; text: string; target: 'details' | 'return' };

function bannerFor(b: BookingWithBook): Banner | null {
  if (b.status === 'overdue' && b.dueAt) {
    return {
      tone: 'overdue',
      title: `Срок возврата прошёл ${dayMonth(b.dueAt)}`,
      text: 'Если книга уже на полке, отметьте возврат',
      target: 'return',
    };
  }
  if (b.status === 'reserved' && b.pickupUntil) {
    return b.fromQueue
      ? {
          tone: 'available',
          title: `Книга освободилась и ждёт вас до ${dayMonthTime(b.pickupUntil)}`,
          text: b.book.title,
          target: 'details',
        }
      : { tone: 'plain', title: `Книга ждёт вас до ${dayMonthTime(b.pickupUntil)}`, text: b.book.title, target: 'details' };
  }
  if (b.status === 'issued' && b.dueAt) {
    return { tone: 'plain', title: `Вернуть до ${dayMonth(b.dueAt)}`, text: b.book.title, target: 'details' };
  }
  return null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const userId = user?.id ?? null;

  const home = useQuery(async () => {
    if (await getDevFlag('loadError')) throw new Error('dev: loadError');
    const [count, recent, settings, summary] = await Promise.all([
      countBooks(),
      recentlyReturned(3),
      getSettings(),
      userId !== null ? getHomeSummary(userId) : Promise.resolve(null),
    ]);
    return { count, recent, settings, summary };
  }, [userId]);

  const search = (q: string) => {
    const text = q.trim();
    if (text) router.push({ pathname: '/search/results', params: { q: text } });
  };

  const data = home.data;
  const loading = home.status === 'loading' || user === undefined;
  const catalogEmpty = !loading && data?.count === 0;
  const isGuest = !user;
  const booking = data?.summary?.banner ?? null;
  const banner = booking ? bannerFor(booking) : null;
  const more = booking?.status === 'reserved' && !booking.fromQueue ? (data?.summary?.otherActive ?? 0) : 0;

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Header
            variant="brand"
            onBrandLongPress={__DEV__ ? () => router.push('/dev') : undefined}
            action={{ icon: 'menu', label: 'Меню', onPress: () => router.push('/menu') }}
          />

          <View style={styles.titleBlock}>
            <TwoToneTitle parts={[{ text: 'Какая книга' }, { text: 'вам', muted: true }, { text: 'нужна?' }]} />
            {(isGuest || catalogEmpty) && data && (
              <AppText tone="secondary">
                Найдите книгу и забронируйте её на {data.settings.pickupHours} часов.
              </AppText>
            )}
          </View>

          <SearchField value={query} onChangeText={setQuery} onSubmit={() => search(query)} />

          {home.status === 'error' && !data ? (
            <EmptyState
              visual={<StatusIcon icon="refresh" tone="busy" />}
              title="Не удалось загрузить данные"
              text="Проверьте подключение и попробуйте ещё раз."
              actions={<Button label="Повторить" variant="secondary" block onPress={() => void home.reload({ showLoading: true })} />}
            />
          ) : loading ? (
            <HomeSkeleton />
          ) : catalogEmpty ? (
            <Glass style={styles.emptyCard}>
              <ShelfIllustration variant="empty" label="Пустая полка" />
              <View style={styles.emptyText}>
                <AppText variant="headline" style={styles.semibold}>
                  Каталог пока наполняется
                </AppText>
                <AppText tone="secondary">Загляните позже — поиск уже работает по тому, что успели добавить.</AppText>
              </View>
            </Glass>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.topics}
                contentContainerStyle={styles.topicsContent}
                accessibilityLabel="Тематики"
              >
                {TOPICS.map((t) => (
                  <TopicChip key={t} label={t} onPress={() => search(t)} />
                ))}
              </ScrollView>

              {booking && banner && (
                <View style={styles.bannerBlock}>
                  <BookingBanner
                    tone={banner.tone}
                    title={banner.title}
                    text={banner.text}
                    cover={booking.book.coverColor}
                    onPress={() =>
                      banner.target === 'return'
                        ? router.push({ pathname: '/bookings', params: { returnId: String(booking.id) } })
                        : router.push(`/booking/${booking.id}`)
                    }
                  />
                  {more > 0 && (
                    <View style={styles.more}>
                      <TextLink label={`и ещё ${more} ${plural(more, ['бронь', 'брони', 'броней'])}`} onPress={() => router.push('/bookings')} />
                    </View>
                  )}
                </View>
              )}

              {data && data.recent.length > 0 && (
                <Glass style={styles.recent}>
                  <TwoToneTitle text="вернулись" muted="Недавно" mutedFirst variant="headline" style={styles.recentTitle} />
                  <View style={styles.tiles}>
                    {data.recent.map((b) => (
                      <BookTile
                        key={b.id}
                        book={{ title: b.title, color: b.coverColor, coverUri: b.coverUri }}
                        chip={{ label: 'В наличии', tone: 'available' }}
                        onPress={() => router.push(`/book/${b.id}`)}
                      />
                    ))}
                  </View>
                </Glass>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function HomeSkeleton() {
  return (
    <View accessibilityLabel="Загрузка" accessibilityState={{ busy: true }} style={styles.skeleton}>
      <View style={styles.skBanner}>
        <Bone kind="block" width={32} height={46} r={6} />
        <View style={styles.skLines}>
          <Bone width="80%" height={12} />
          <Bone width="50%" height={10} />
        </View>
      </View>
      <View style={styles.skPanel}>
        <Bone width="45%" height={14} style={styles.skIndent} />
        <View style={styles.tiles}>
          <Bone kind="block" height={178} r={radius.lg} style={styles.flex} />
          <Bone kind="block" height={178} r={radius.lg} style={styles.flex} />
          <Bone kind="block" height={178} r={radius.lg} style={styles.flex} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  content: { padding: space[4], paddingBottom: 120, gap: space[4] },
  titleBlock: { gap: space[2], marginTop: space[2], marginHorizontal: space[2] },
  topics: { marginHorizontal: -space[4] },
  topicsContent: { paddingHorizontal: space[4], gap: space[2] },
  bannerBlock: { gap: 6 },
  more: { alignSelf: 'flex-start', paddingVertical: space[1], paddingHorizontal: space[3] },
  recent: { gap: space[3], paddingTop: space[4], paddingHorizontal: space[3], paddingBottom: space[3] },
  recentTitle: { paddingHorizontal: space[2] },
  tiles: { flexDirection: 'row', gap: space[2] },
  emptyCard: { gap: space[3], padding: space[3] },
  emptyText: { gap: space[1], paddingHorizontal: space[2], paddingBottom: space[1] },
  skeleton: { gap: space[4] },
  skBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: ui.skeletonGlass,
  },
  skLines: { flex: 1, gap: space[2] },
  skPanel: {
    gap: space[3],
    paddingTop: space[4],
    paddingHorizontal: space[3],
    paddingBottom: space[3],
    borderRadius: radius['2xl'],
    backgroundColor: ui.skeletonGlass,
  },
  skIndent: { marginLeft: space[2] },
});
