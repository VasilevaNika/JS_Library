// Импорт каталога из таблицы: проверка строк и запись одной транзакцией.
// Разбор CSV/XLSX — на экране импорта; сюда приходят уже сопоставленные колонки.
import { findBookByIsbn, findBookByTitleAuthor, infoAuthors, isValidIsbn, shortAuthors } from './books';
import { getDb } from './client';
import { bookSearchText } from './mappers';
import { now } from './time';
import type { CoverColor } from '@/theme/tokens';

export type ImportRow = {
  /** Номер строки в файле — для «Строка» в таблице проверки. */
  line: number;
  title: string;
  author: string;
  isbn: string;
  copies: number;
  coverUri: string;
};

export type ImportCheck =
  | { kind: 'new' }
  | { kind: 'exists'; bookId: number }
  | { kind: 'error'; error: 'noAuthor' | 'noTitle' | 'badIsbn' | 'badCopies' };

export type CheckedRow = ImportRow & { check: ImportCheck };

export type ImportSummary = {
  rows: CheckedRow[];
  total: number;
  toAdd: number;
  existing: number;
  errors: number;
};

export async function checkImportRows(rows: ImportRow[]): Promise<ImportSummary> {
  const checked: CheckedRow[] = [];
  for (const r of rows) {
    let check: ImportCheck;
    if (!r.title.trim()) check = { kind: 'error', error: 'noTitle' };
    else if (!r.author.trim()) check = { kind: 'error', error: 'noAuthor' };
    else if (r.isbn.trim() && !isValidIsbn(r.isbn)) check = { kind: 'error', error: 'badIsbn' };
    else if (!Number.isInteger(r.copies) || r.copies < 1) check = { kind: 'error', error: 'badCopies' };
    else {
      const existing = (r.isbn.trim() && (await findBookByIsbn(r.isbn))) || (await findBookByTitleAuthor(r.title, r.author));
      check = existing ? { kind: 'exists', bookId: existing.id } : { kind: 'new' };
    }
    checked.push({ ...r, check });
  }
  return {
    rows: checked,
    total: checked.length,
    toAdd: checked.filter((r) => r.check.kind === 'new').length,
    existing: checked.filter((r) => r.check.kind === 'exists').length,
    errors: checked.filter((r) => r.check.kind === 'error').length,
  };
}

/** Что делать с книгами, которые уже есть в каталоге. */
export type DuplicateMode = 'skip' | 'increase';

export type ImportResult = { added: number; increased: number; skipped: number };

const COVERS: CoverColor[] = ['teal', 'terracotta', 'mustard', 'violet', 'graphite', 'green', 'rose', 'sky', 'ochre'];

/** Строки с ошибками пропускаются. При сбое транзакция откатывается — каталог остаётся прежним. */
export async function commitImport(summary: ImportSummary, mode: DuplicateMode): Promise<ImportResult> {
  const db = await getDb();
  const result: ImportResult = { added: 0, increased: 0, skipped: summary.errors };
  const countRow = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM books');
  let colorIdx = countRow?.n ?? 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const t = now();
    for (const r of summary.rows) {
      if (r.check.kind === 'exists') {
        if (mode === 'increase') {
          await txn.runAsync('UPDATE books SET copies_total = copies_total + ? WHERE id = ?', r.copies, r.check.bookId);
          result.increased++;
        }
      } else if (r.check.kind === 'new') {
        const book = { title: r.title.trim(), authorsFull: r.author.trim(), isbn: r.isbn.trim() || null, topic: '' };
        await txn.runAsync(
          `INSERT INTO books (title, authors_full, authors_short, authors_info, isbn, year, copies_total, cover_color,
            cover_uri, topic, shelf, added_at, search_text)
           VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, '', '', ?, ?)`,
          book.title,
          book.authorsFull,
          shortAuthors(book.authorsFull),
          infoAuthors(book.authorsFull),
          book.isbn,
          r.copies,
          COVERS[colorIdx++ % COVERS.length],
          r.coverUri.trim() || null,
          t,
          bookSearchText(book),
        );
        result.added++;
      }
    }
  });
  return result;
}
