// M3 · Каталог. Состояния: список, каталог пуст (+ загрузка, ошибка, ничего не найдено по поиску).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppText,
  BookCover,
  Button,
  Cell,
  type Column,
  DataTable,
  EmptyState,
  LoadError,
  LoadingBlock,
  Panel,
  ShelfIllustration,
  StatusChip,
  StatusIcon,
  ToolbarSearch,
} from '@/components';
import { countBooks, listCatalog, type BookWithAvailability, type CatalogStatus } from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { plural } from '@/lib/format';
import { colors, fonts, space, type StatusTone, typography } from '@/theme/tokens';

const STATUS: Record<CatalogStatus, { label: string; tone: StatusTone }> = {
  available: { label: 'В наличии', tone: 'available' },
  allReserved: { label: 'Всё занято', tone: 'busy' },
  allIssued: { label: 'Всё выдано', tone: 'busy' },
};

export default function CatalogScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const q = useQuery(async () => {
    const [rows, total] = await Promise.all([listCatalog(query), countBooks()]);
    return { rows, total };
  }, [query]);

  const edit = (id: number) => router.push({ pathname: '/moderator/catalog/book', params: { id: String(id) } });
  const add = () => router.push('/moderator/catalog/book');
  const toImport = () => router.push('/moderator/catalog/import');

  const total = q.data?.total ?? 0;
  const rows = q.data?.rows ?? [];
  const hasBooks = total > 0;

  const columns: Column<BookWithAvailability>[] = [
    {
      key: 'title',
      title: 'Книга',
      flex: 1.6,
      render: (b) => (
        <Pressable onPress={() => edit(b.id)} accessibilityRole="link" style={styles.bookCell}>
          <BookCover color={b.coverColor} uri={b.coverUri} width={28} height={40} lines={1} />
          <Cell strong>{b.title}</Cell>
        </Pressable>
      ),
    },
    { key: 'author', title: 'Автор', flex: 1.2, render: (b) => <Cell tone="neutral">{b.authorsFull}</Cell> },
    { key: 'isbn', title: 'ISBN', width: 150, render: (b) => <Cell tone="neutral" tabular>{b.isbn ?? '—'}</Cell> },
    {
      key: 'count',
      title: 'На полке / всего',
      width: 130,
      render: (b) => (
        <Text style={styles.count}>
          {b.availability.onShelf} / {b.copiesTotal}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Сейчас',
      width: 140,
      render: (b) => <StatusChip label={STATUS[b.catalogStatus].label} tone={STATUS[b.catalogStatus].tone} size="sm" />,
    },
  ];

  let body;
  if (q.status === 'loading') {
    body = (
      <LoadingBlock />
    );
  } else if (q.status === 'error' && !q.data) {
    body = (
      <LoadError container="card" title="Не удалось загрузить каталог" onRetry={() => void q.reload({ showLoading: true })} />
    );
  } else if (!hasBooks) {
    body = (
      <EmptyState
        container="card"
        style={styles.empty}
        visual={<ShelfIllustration variant="catalogEmpty" label="Пустая полка" />}
        title="Каталог пуст"
        text="Загрузите фонд одной таблицей или добавьте первые книги вручную. Студенты увидят их в поиске сразу после сохранения."
        actions={
          <View style={styles.row}>
            <Button label="Импортировать из таблицы" variant="dark" onPress={toImport} />
            <Button label="Добавить вручную" variant="secondary" onPress={add} />
          </View>
        }
      />
    );
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        container="card"
        visual={<StatusIcon icon="search" tone="sunken" />}
        title="Ничего не нашлось"
        text={`По запросу «${query}». Проверьте написание или попробуйте фамилию автора без инициалов.`}
        actions={<Button label="Сбросить поиск" variant="dark" onPress={() => setQuery('')} style={styles.center} />}
      />
    );
  } else {
    body = (
      <>
        <DataTable columns={columns} rows={rows} rowKey={(b) => b.id} minWidth={900} onRowPress={(b) => edit(b.id)} />
        <View style={styles.footer}>
          <AppText variant="micro" tone="secondary" style={styles.regular}>
            Показано {rows.length} из {total}
          </AppText>
          <AppText variant="micro" tone="secondary" style={styles.regular}>
            По алфавиту
          </AppText>
        </View>
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel
        title="Каталог"
        muted={hasBooks ? `· ${total} ${plural(total, ['книга', 'книги', 'книг'])}` : undefined}
        style={styles.panel}
        actions={
          hasBooks ? (
            <>
              <ToolbarSearch
                value={query}
                onChangeText={setQuery}
                placeholder="Название, автор или ISBN"
                accessibilityLabel="Поиск по каталогу"
                width={280}
              />
              <Button label="Импорт из таблицы" variant="secondary" size="md" onPress={toImport} />
              <Button label="Добавить книгу" variant="dark" size="md" icon="plus" onPress={add} />
            </>
          ) : undefined
        }
      >
        {body}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignSelf: 'center' },
  regular: { fontFamily: fonts.regular },
  content: { flexGrow: 1, paddingHorizontal: space[6], paddingBottom: space[6] },
  panel: { flexGrow: 1 },
  empty: { paddingVertical: 80 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[2] },
  bookCell: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] },
  count: { ...typography.tableMedium, fontVariant: ['tabular-nums'], color: colors.ink },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space[2] },
});
