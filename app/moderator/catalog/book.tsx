// M5 · Новая книга / Правка книги. Состояния: новая (с ошибкой автора), такая книга уже есть (дубликат ISBN),
// правка (убрать из каталога нельзя, пока есть активные брони).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  BookCover,
  Button,
  Dialog,
  Icon,
  IconButton,
  LoadError,
  LoadingBlock,
  Notice,
  Panel,
  Stepper,
  TextField,
  TwoToneTitle,
} from '@/components';
import {
  addBook,
  findBookByIsbn,
  getActiveUsage,
  getBook,
  removeBook,
  updateBook,
  type Book,
  type BookInputError,
} from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { pickCoverImage } from '@/lib/files';
import { plural, splitBookTitle } from '@/lib/format';
import { colors, space, ui } from '@/theme/tokens';

export default function BookFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const bookId = params.id ? Number(params.id) : null;

  const existing = useQuery(async () => {
    if (bookId === null) return null;
    const [book, usage] = await Promise.all([getBook(bookId), getActiveUsage(bookId)]);
    return book ? { book, usage } : null;
  }, [bookId]);

  const back = () => router.dismissTo('/moderator/catalog');

  if (bookId !== null && existing.status === 'loading') return <LoadingBlock />;
  // Книгу удалили или ссылка устарела — не открываем форму как «новую».
  if (bookId !== null && (existing.status === 'error' || !existing.data)) {
    return (
      <View style={styles.missing}>
        <LoadError
          container="card"
          title={existing.status === 'error' ? undefined : 'Книга не найдена'}
          onRetry={() => void existing.reload({ showLoading: true })}
        />
      </View>
    );
  }

  return (
    <BookForm
      key={bookId ?? 'new'}
      book={existing.data?.book ?? null}
      usage={existing.data?.usage ?? null}
      onDone={back}
      onOpen={(id) => router.setParams({ id: String(id) })}
    />
  );
}

function BookForm({
  book,
  usage,
  onDone,
  onOpen,
}: {
  book: Book | null;
  usage: { reserved: number; issued: number } | null;
  onDone: () => void;
  onOpen: (id: number) => void;
}) {
  const edit = !!book;
  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.authorsFull ?? '');
  const [isbn, setIsbn] = useState(book?.isbn ?? '');
  const [year, setYear] = useState(book?.year ? String(book.year) : '');
  const [copies, setCopies] = useState(book?.copiesTotal ?? 1);
  const [coverUri, setCoverUri] = useState<string | null>(book?.coverUri ?? null);
  const [errors, setErrors] = useState<BookInputError[]>([]);
  const [duplicate, setDuplicate] = useState<Book | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);

  const checkIsbn = async () => {
    setDuplicate(isbn.trim() ? await findBookByIsbn(isbn, book?.id) : null);
  };

  const save = async () => {
    setBusy(true);
    try {
      const input = { title, authorsFull: author, isbn, year, copiesTotal: copies, coverUri };
      const res = book ? await updateBook(book.id, input) : await addBook(input);
      if (!res.ok) {
        setErrors(res.errors);
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const blocked = !!usage && usage.reserved + usage.issued > 0;
  const [coverTitle, coverSubtitle] = splitBookTitle(book?.title ?? '');

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Panel style={styles.panel}>
        <View style={styles.head}>
          <IconButton icon="back" variant="plain" accessibilityLabel="Назад в каталог" onPress={onDone} />
          <TwoToneTitle text={edit ? 'Правка' : 'Новая'} muted="книга" variant="titleLg" />
        </View>

        {duplicate && (
          <Notice
            tone="busy"
            text={`Книга с этим ISBN уже есть в каталоге: «${duplicate.title}», ${duplicate.copiesTotal} экз.`}
            action={{ label: 'Открыть её', onPress: () => onOpen(duplicate.id) }}
          />
        )}

        <View style={styles.body}>
          <View style={styles.coverCol}>
            <View>
              <BookCover
                color={book?.coverColor ?? 'green'}
                uri={coverUri}
                size="lg"
                title={edit ? coverTitle : undefined}
                subtitle={edit ? coverSubtitle : undefined}
                accessibilityLabel="Обложка"
              />
              {!edit && !coverUri && (
                <View pointerEvents="none" style={styles.upload}>
                  <Icon name="upload" size={28} color={colors.onDark} />
                </View>
              )}
            </View>
            <Button
              label={edit ? 'Заменить обложку' : 'Выбрать файл'}
              variant="tertiary"
              size="md"
              onPress={async () => {
                const uri = await pickCoverImage();
                if (uri) setCoverUri(uri);
              }}
            />
            <AppText variant="caption" tone="secondary" align="center" style={styles.coverNote}>
              JPG или PNG. Без обложки — цветная заглушка.
            </AppText>
          </View>

          <View style={styles.form}>
            <TextField
              size="md"
              label="Название *"
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                setErrors((e) => e.filter((x) => x !== 'titleRequired'));
              }}
              placeholder="Как на титульном листе"
              error={errors.includes('titleRequired') ? 'Укажите название.' : undefined}
            />
            <TextField
              size="md"
              label="Автор *"
              value={author}
              onChangeText={(v) => {
                setAuthor(v);
                setErrors((e) => e.filter((x) => x !== 'authorRequired'));
              }}
              placeholder="Фамилия И. О."
              error={errors.includes('authorRequired') ? 'Укажите автора — по нему студенты ищут книгу.' : undefined}
            />
            <View style={styles.pair}>
              <TextField
                size="md"
                label="ISBN"
                value={isbn}
                onChangeText={(v) => {
                  setIsbn(v);
                  setDuplicate(null);
                }}
                onBlur={() => void checkIsbn()}
                placeholder="978-…"
                tabular
                state={duplicate ? 'warning' : 'default'}
                style={styles.flex}
              />
              <TextField
                size="md"
                label="Год издания"
                value={year}
                onChangeText={(v) => setYear(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="Например, 2019"
                keyboardType="number-pad"
                tabular
                style={styles.flex}
              />
            </View>
            <View style={styles.copies}>
              <AppText variant="micro" tone="secondary" style={styles.label}>
                Экземпляров *
              </AppText>
              <Stepper value={copies} onChange={setCopies} min={1} />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.removeCol}>
            {edit && (
              <>
                <Button
                  label="Убрать из каталога"
                  variant="danger"
                  size="md"
                  disabled={blocked}
                  onPress={() => setConfirmRemove(true)}
                />
                {blocked && usage && (
                  <AppText variant="caption" tone="secondary" style={styles.label}>
                    Нельзя, пока на книгу есть активные брони: {usage.reserved} {plural(usage.reserved, ['бронь', 'брони', 'броней'])},{' '}
                    {usage.issued} {plural(usage.issued, ['выдача', 'выдачи', 'выдач'])}.
                  </AppText>
                )}
              </>
            )}
          </View>
          <View style={styles.row}>
            <Button label="Отмена" variant="secondary" onPress={onDone} />
            <Button
              label={edit ? 'Сохранить изменения' : 'Добавить в каталог'}
              variant="dark"
              loading={busy}
              onPress={() => void save()}
            />
          </View>
        </View>
      </Panel>

      <Dialog
        desktop
        visible={confirmRemove}
        title={`Убрать «${book?.title ?? ''}» из каталога?`}
        text="Книга пропадёт из поиска, история её броней удалится."
        cancelLabel="Отмена"
        confirmLabel="Убрать из каталога"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={async () => {
          setConfirmRemove(false);
          if (book && (await removeBook(book.id)).ok) onDone();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { paddingHorizontal: space[6] },
  content: { flexGrow: 1, paddingHorizontal: space[6], paddingBottom: space[6] },
  panel: { alignSelf: 'center', width: '100%', maxWidth: 960, gap: space[6], padding: space[6] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  body: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  coverCol: { alignItems: 'center', gap: space[3] },
  upload: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  coverNote: { maxWidth: 152 },
  form: { flexGrow: 1, flexShrink: 1, flexBasis: 420, minWidth: 0, gap: space[4] },
  pair: { flexDirection: 'row', gap: space[3] },
  copies: { gap: space[2], maxWidth: 240 },
  label: { paddingLeft: space[2] },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingTop: space[2],
    borderTopWidth: 1,
    borderTopColor: ui.panelDivider,
  },
  removeCol: { gap: space[1], flexShrink: 1 },
  row: { flexDirection: 'row', gap: space[2] },
});
