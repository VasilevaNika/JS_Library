// S2 · Результаты поиска. Состояния: results, loading, offline, live (только что забронировали),
// «Ничего не нашлось» с похожими и без (+ ошибка загрузки).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Banner,
  Bone,
  BookRow,
  Button,
  EmptyState,
  Glass,
  Header,
  ScreenBackground,
  SearchField,
  ShelfIllustration,
  SkeletonRow,
  StatusIcon,
  TwoToneTitle,
} from '@/components';
import { getDevFlag, searchBooks, similarBooks, type BookWithAvailability } from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { dayMonthShort, plural, time } from '@/lib/format';
import { fonts, space } from '@/theme/tokens';

type Row = {
  book: BookWithAvailability;
  meta: string;
  chip: { label: string; tone: 'available' | 'busy' };
  highlighted?: boolean;
};

/** Мета строки: автор и, если книги нет на полке, когда она освободится. */
function toRow(b: BookWithAvailability, style: 'results' | 'similar'): Row {
  if (b.publicStatus === 'available') {
    return { book: b, meta: b.authorsShort, chip: { label: 'В наличии', tone: 'available' } };
  }
  const when = b.nextFreeAt ? dayMonthShort(b.nextFreeAt) : null;
  if (b.publicStatus === 'busy') {
    const meta = when ? `${b.authorsShort} · ${style === 'similar' ? 'до' : 'освободится'} ${when}` : b.authorsShort;
    return { book: b, meta, chip: { label: 'Занята', tone: 'busy' } };
  }
  const meta = when ? `${b.authorsShort} · ${style === 'similar' ? 'до' : 'вернут до'} ${when}` : b.authorsShort;
  return { book: b, meta, chip: { label: 'Выдана', tone: 'busy' } };
}

const SKELETON_WIDTHS = ['78%', '62%', '84%', '55%'] as const;

export default function ResultsScreen() {
  const router = useRouter();
  const { q = '' } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(q);
  const [shownQ, setShownQ] = useState(q);
  // Новый запрос из параметров (тема с главной, повторный поиск) — обновляем поле.
  if (q !== shownQ) {
    setShownQ(q);
    setQuery(q);
  }

  const result = useQuery(async () => {
    const [offline, race] = await Promise.all([getDevFlag('offline'), getDevFlag('race')]);
    if (await getDevFlag('loadError')) throw new Error('dev: loadError');
    const found = await searchBooks(q);
    const similar = found.length === 0 ? await similarBooks(q, 3) : [];
    return { found, similar, offline, race, loadedAt: Date.now() };
  }, [q]);

  const submit = () => {
    const text = query.trim();
    if (text && text !== q) router.setParams({ q: text });
  };
  const toHome = () => router.navigate('/search');

  const data = result.data;
  const rows: Row[] = (data?.found ?? []).map((b) => toRow(b, 'results'));
  if (data?.race && rows[0]) {
    rows[0] = {
      ...rows[0],
      meta: `${rows[0].book.authorsShort} · только что забронировали`,
      chip: { label: 'Занята', tone: 'busy' },
      highlighted: true,
    };
  }
  const openBook = (r: Row) =>
    router.push({ pathname: '/book/[id]', params: r.highlighted ? { id: String(r.book.id), race: '1' } : { id: String(r.book.id) } });

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Header
            variant="brand"
            onBrandPress={toHome}
            action={{ icon: 'menu', label: 'Меню', onPress: () => router.push('/menu') }}
          />

          {data?.offline && (
            <Banner
              text={`Нет подключения. Показаны данные на ${time(data.loadedAt)}`}
              actionLabel="Повторить"
              onAction={() => void result.reload()}
            />
          )}

          <SearchField value={query} onChangeText={setQuery} onSubmit={submit} onClear={toHome} />

          {result.status === 'error' && !data ? (
            <EmptyState
              visual={<StatusIcon icon="refresh" tone="busy" />}
              title="Не удалось загрузить данные"
              text="Проверьте подключение и попробуйте ещё раз."
              actions={<Button label="Повторить" variant="secondary" block onPress={() => void result.reload({ showLoading: true })} />}
            />
          ) : result.status === 'loading' ? (
            <Glass style={styles.section}>
              <Bone width="36%" height={14} style={styles.indent} />
              {SKELETON_WIDTHS.map((w) => (
                <SkeletonRow key={w} titleWidth={w} />
              ))}
            </Glass>
          ) : rows.length > 0 ? (
            <Glass style={[styles.section, data?.offline && styles.stale]}>
              <TwoToneTitle
                text={`${rows.length} ${plural(rows.length, ['книга', 'книги', 'книг'])}`}
                muted="Найдено"
                mutedFirst
                variant="headline"
                style={styles.indent}
              />
              <View style={styles.list}>
                {rows.map((r) => (
                  <BookRow
                    key={r.book.id}
                    book={{ title: r.book.title, color: r.book.coverColor, coverUri: r.book.coverUri }}
                    meta={r.meta}
                    chip={r.chip}
                    highlighted={r.highlighted}
                    onPress={() => openBook(r)}
                  />
                ))}
              </View>
            </Glass>
          ) : (
            <>
              <Glass style={styles.notFound}>
                <ShelfIllustration variant="notFound" label="Полка с пустым местом" />
                <View style={styles.notFoundText}>
                  <TwoToneTitle text="Ничего" muted="не нашлось" variant="headline" style={styles.semibold} />
                  <AppText variant="caption" tone="secondary">
                    По запросу «{q}». Проверьте написание или попробуйте фамилию автора без инициалов.
                  </AppText>
                  <Button label="Изменить запрос" variant="light" size="md" onPress={toHome} style={styles.change} />
                </View>
              </Glass>
              {data && data.similar.length > 0 && (
                <Glass style={styles.section}>
                  <TwoToneTitle parts={[{ text: 'Возможно, вы искали', muted: true }]} variant="headline" style={styles.indent} />
                  <View style={styles.list}>
                    {data.similar.map((b) => {
                      const r = toRow(b, 'similar');
                      return (
                        <BookRow
                          key={b.id}
                          book={{ title: b.title, color: b.coverColor, coverUri: b.coverUri }}
                          meta={r.meta}
                          chip={r.chip}
                          onPress={() => openBook(r)}
                        />
                      );
                    })}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  content: { padding: space[4], paddingBottom: 120, gap: space[4] },
  section: { gap: space[3], paddingTop: space[4], paddingHorizontal: space[3], paddingBottom: space[3] },
  stale: { opacity: 0.75 },
  indent: { paddingHorizontal: space[2] },
  list: { gap: space[2] },
  notFound: { flexDirection: 'row', alignItems: 'center', gap: space[4], padding: space[4] },
  notFoundText: { flex: 1, minWidth: 0, gap: space[1] },
  change: { marginTop: space[1] },
});
