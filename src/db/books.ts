import type { CoverColor } from '@/theme/tokens';

import { getDb } from './client';
import { bookSearchText, normalizeSearch, toBook, type BookRow } from './mappers';
import { now } from './time';
import type { Availability, Book, BookPublicStatus, BookWithAvailability, CatalogStatus } from './types';

type BookAggRow = BookRow & {
  reserved: number | null;
  issued: number | null;
  queue: number;
  next_pickup: number | null;
  next_due: number | null;
  last_returned: number | null;
};

const BOOK_AGG_SQL = `
  SELECT b.id, b.title, b.authors_full, b.authors_short, b.authors_info, b.isbn, b.year,
    b.copies_total, b.cover_color, b.cover_uri, b.topic, b.shelf, b.added_at,
    SUM(k.status = 'reserved') AS reserved,
    SUM(k.status IN ('issued', 'overdue')) AS issued,
    (SELECT COUNT(*) FROM queue_entries q WHERE q.book_id = b.id) AS queue,
    MIN(CASE WHEN k.status = 'reserved' THEN k.pickup_until END) AS next_pickup,
    MIN(CASE WHEN k.status IN ('issued', 'overdue') THEN k.due_at END) AS next_due,
    MAX(CASE WHEN k.status IN ('awaiting_check', 'closed') THEN COALESCE(k.return_marked_at, k.closed_at) END)
      AS last_returned
  FROM books b
  LEFT JOIN bookings k ON k.book_id = b.id
`;

function toBookWithAvailability(r: BookAggRow): BookWithAvailability {
  const book = toBook(r);
  const reserved = r.reserved ?? 0;
  const issued = r.issued ?? 0;
  const availability: Availability = {
    onShelf: Math.max(0, book.copiesTotal - reserved - issued),
    reserved,
    issued,
    queue: r.queue,
  };
  let publicStatus: BookPublicStatus = 'available';
  let catalogStatus: CatalogStatus = 'available';
  let nextFreeAt: number | null = null;
  if (availability.onShelf === 0) {
    if (reserved > 0) {
      publicStatus = 'busy';
      catalogStatus = 'allReserved';
      nextFreeAt = r.next_pickup;
    } else {
      publicStatus = 'issued';
      catalogStatus = 'allIssued';
      nextFreeAt = r.next_due;
    }
  }
  return { ...book, availability, publicStatus, catalogStatus, nextFreeAt, lastReturnedAt: r.last_returned };
}

const ENDING = /(ами|ями|ого|его|ому|ему|ов|ев|ей|ам|ям|ах|ях|ом|ем|ой|ий|ый|ая|яя|ое|ее|ы|и|а|я|у|ю|е|о|ь)$/;

/** Грубое отсечение окончания, чтобы «алгоритмы» находили «алгоритм». Основа — не короче 4 букв. */
function stem(word: string): string {
  const cut = word.replace(ENDING, '');
  return cut.length >= 4 ? cut : word;
}

function searchWords(query: string): string[] {
  return normalizeSearch(query).split(' ').filter(Boolean).map(stem);
}

/** Поиск по названию, автору, ISBN и теме: все слова запроса должны встретиться. */
export async function searchBooks(query: string): Promise<BookWithAvailability[]> {
  const words = searchWords(query);
  if (words.length === 0) return [];
  const db = await getDb();
  const where = words.map(() => 'b.search_text LIKE ?').join(' AND ');
  const rows = await db.getAllAsync<BookAggRow>(
    `${BOOK_AGG_SQL} WHERE ${where} GROUP BY b.id ORDER BY b.title`,
    ...words.map((w) => `%${w}%`),
  );
  return rows.map(toBookWithAvailability);
}

/** «Возможно, вы искали»: совпадение по первым трём буквам любого слова запроса. */
export async function similarBooks(query: string, limit = 3): Promise<BookWithAvailability[]> {
  const prefixes = searchWords(query)
    .map((w) => w.slice(0, 3))
    .filter((w) => w.length === 3);
  if (prefixes.length === 0) return [];
  const db = await getDb();
  const where = prefixes.map(() => "(' ' || b.search_text) LIKE ?").join(' OR ');
  const score = prefixes.map(() => "((' ' || b.search_text) LIKE ?)").join(' + ');
  const params = prefixes.map((p) => `% ${p}%`);
  const rows = await db.getAllAsync<BookAggRow>(
    `${BOOK_AGG_SQL} WHERE ${where} GROUP BY b.id ORDER BY (${score}) DESC, b.title LIMIT ?`,
    ...params,
    ...params,
    limit,
  );
  return rows.map(toBookWithAvailability);
}

export async function getBook(id: number): Promise<BookWithAvailability | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BookAggRow>(`${BOOK_AGG_SQL} WHERE b.id = ? GROUP BY b.id`, id);
  return row && row.id !== null ? toBookWithAvailability(row) : null;
}

/** «Недавно вернулись»: книги в наличии, которые вернули последними. */
export async function recentlyReturned(limit = 3): Promise<BookWithAvailability[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BookAggRow>(
    `${BOOK_AGG_SQL} GROUP BY b.id HAVING last_returned IS NOT NULL ORDER BY last_returned DESC`,
  );
  return rows
    .map(toBookWithAvailability)
    .filter((b) => b.availability.onShelf > 0)
    .slice(0, limit);
}

export async function countBooks(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM books');
  return row?.n ?? 0;
}

/** Каталог модератора: по алфавиту, с поиском. */
export async function listCatalog(query = ''): Promise<BookWithAvailability[]> {
  const words = searchWords(query);
  const db = await getDb();
  const where = words.length ? 'WHERE ' + words.map(() => 'b.search_text LIKE ?').join(' AND ') : '';
  const rows = await db.getAllAsync<BookAggRow>(
    `${BOOK_AGG_SQL} ${where} GROUP BY b.id ORDER BY b.title`,
    ...words.map((w) => `%${w}%`),
  );
  return rows.map(toBookWithAvailability);
}

export async function listTopics(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ topic: string }>(
    'SELECT topic FROM books GROUP BY topic ORDER BY MIN(id)',
  );
  return rows.map((r) => r.topic);
}

export function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[^0-9Xx]/g, '').toUpperCase();
}

/** ISBN-10 или ISBN-13 по количеству цифр. */
export function isValidIsbn(isbn: string): boolean {
  const n = normalizeIsbn(isbn);
  return n.length === 10 || n.length === 13;
}

export async function findBookByIsbn(isbn: string, exceptId?: number): Promise<Book | null> {
  const n = normalizeIsbn(isbn);
  if (!n) return null;
  const db = await getDb();
  const rows = await db.getAllAsync<BookRow>('SELECT * FROM books WHERE isbn IS NOT NULL AND id != ?', exceptId ?? -1);
  const row = rows.find((r) => r.isbn && normalizeIsbn(r.isbn) === n);
  return row ? toBook(row) : null;
}

export async function findBookByTitleAuthor(title: string, author: string): Promise<Book | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<BookRow>('SELECT * FROM books');
  const t = normalizeSearch(title);
  const a = normalizeSearch(author);
  const row = rows.find((r) => normalizeSearch(r.title) === t && normalizeSearch(r.authors_full) === a);
  return row ? toBook(row) : null;
}

export type BookInput = {
  title: string;
  authorsFull: string;
  isbn: string;
  year: string;
  copiesTotal: number;
  coverUri: string | null;
};

export type BookInputError = 'titleRequired' | 'authorRequired' | 'copiesInvalid';

export function validateBook(input: BookInput): BookInputError[] {
  const errors: BookInputError[] = [];
  if (!input.title.trim()) errors.push('titleRequired');
  if (!input.authorsFull.trim()) errors.push('authorRequired');
  if (!Number.isInteger(input.copiesTotal) || input.copiesTotal < 1) errors.push('copiesInvalid');
  return errors;
}

/** «Т. Кормен, Ч. Лейзерсон, Р. Ривест» → «Т. Кормен и др.» */
export function shortAuthors(full: string): string {
  const parts = full.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 2 ? `${parts[0]} и др.` : parts.join(', ');
}

/** «Т. Кормен, Ч. Лейзерсон, Р. Ривест» → «Кормен, Лейзерсон и др.» */
export function infoAuthors(full: string): string {
  const surnames = full
    .split(',')
    .map((p) => p.trim().split(/\s+/).pop() ?? '')
    .filter(Boolean);
  return surnames.length > 2 ? `${surnames.slice(0, 2).join(', ')} и др.` : surnames.join(', ');
}

const COVER_ROTATION: CoverColor[] = ['teal', 'terracotta', 'mustard', 'violet', 'graphite', 'green', 'rose', 'sky', 'ochre'];

export async function addBook(
  input: BookInput,
  extra: { topic?: string; shelf?: string } = {},
): Promise<{ ok: true; id: number } | { ok: false; errors: BookInputError[] }> {
  const errors = validateBook(input);
  if (errors.length) return { ok: false, errors };
  const db = await getDb();
  const last = await db.getFirstAsync<{ cover_color: string }>('SELECT cover_color FROM books ORDER BY id DESC LIMIT 1');
  const lastIdx = last ? COVER_ROTATION.indexOf(last.cover_color as CoverColor) : -1;
  const color = COVER_ROTATION[(lastIdx + 1) % COVER_ROTATION.length];
  const book = {
    title: input.title.trim(),
    authorsFull: input.authorsFull.trim(),
    isbn: input.isbn.trim() || null,
    topic: extra.topic ?? '',
  };
  const res = await db.runAsync(
    `INSERT INTO books (title, authors_full, authors_short, authors_info, isbn, year, copies_total, cover_color,
      cover_uri, topic, shelf, added_at, search_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    book.title,
    book.authorsFull,
    shortAuthors(book.authorsFull),
    infoAuthors(book.authorsFull),
    book.isbn,
    input.year.trim() ? Number(input.year) : null,
    input.copiesTotal,
    color,
    input.coverUri,
    book.topic,
    extra.shelf ?? '',
    now(),
    bookSearchText(book),
  );
  return { ok: true, id: res.lastInsertRowId };
}

export async function updateBook(
  id: number,
  input: BookInput,
): Promise<{ ok: true } | { ok: false; errors: BookInputError[] }> {
  const errors = validateBook(input);
  if (errors.length) return { ok: false, errors };
  const db = await getDb();
  const current = await db.getFirstAsync<BookRow>('SELECT * FROM books WHERE id = ?', id);
  if (!current) throw new Error('Книга не найдена');
  const book = {
    title: input.title.trim(),
    authorsFull: input.authorsFull.trim(),
    isbn: input.isbn.trim() || null,
    topic: current.topic,
  };
  await db.runAsync(
    `UPDATE books SET title = ?, authors_full = ?, authors_short = ?, authors_info = ?, isbn = ?, year = ?,
      copies_total = ?, cover_uri = ?, search_text = ? WHERE id = ?`,
    book.title,
    book.authorsFull,
    shortAuthors(book.authorsFull),
    infoAuthors(book.authorsFull),
    book.isbn,
    input.year.trim() ? Number(input.year) : null,
    input.copiesTotal,
    input.coverUri,
    bookSearchText(book),
    id,
  );
  return { ok: true };
}

/** Активные брони и выдачи книги — пока они есть, убрать книгу из каталога нельзя. */
export async function getActiveUsage(bookId: number): Promise<{ reserved: number; issued: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ reserved: number | null; issued: number | null }>(
    `SELECT SUM(status = 'reserved') AS reserved, SUM(status IN ('issued', 'overdue')) AS issued
     FROM bookings WHERE book_id = ?`,
    bookId,
  );
  return { reserved: row?.reserved ?? 0, issued: row?.issued ?? 0 };
}

export async function removeBook(id: number): Promise<{ ok: boolean }> {
  const usage = await getActiveUsage(id);
  if (usage.reserved + usage.issued > 0) return { ok: false };
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM queue_entries WHERE book_id = ?', id);
    await txn.runAsync('DELETE FROM status_events WHERE booking_id IN (SELECT id FROM bookings WHERE book_id = ?)', id);
    await txn.runAsync('DELETE FROM bookings WHERE book_id = ?', id);
    await txn.runAsync('DELETE FROM books WHERE id = ?', id);
  });
  return { ok: true };
}
