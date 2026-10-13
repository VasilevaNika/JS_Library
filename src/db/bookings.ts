// Брони, очередь и переходы статусов (студенческая сторона).
import type { SQLiteDatabase } from 'expo-sqlite';

import { getBook } from './books';
import { getDb } from './client';
import {
  toBook,
  toBooking,
  toStatusEvent,
  toUser,
  type BookingRow,
  type BookRow,
  type StatusEventRow,
  type UserRow,
} from './mappers';
import { makeBookingCode } from './password';
import { getSettings } from './settings';
import { addDays, DAY, HOUR, now, startOfDay } from './time';
import type {
  ActorType,
  BookingStatus,
  BookingWithBook,
  BookingWithBookAndUser,
  BookWithAvailability,
  Millis,
  StatusEvent,
} from './types';

// ───────── Внутренние помощники ─────────

/** Срок брони: день, в который истекают `hours` часов, до закрытия абонемента («до 18 сентября, 20:00»). */
export function deadlineAt(from: Millis, hours: number, closingTime: string): Millis {
  const [h, m] = closingTime.split(':').map(Number);
  const d = new Date(from + hours * HOUR);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}

export async function uniqueCode(db: SQLiteDatabase): Promise<string> {
  for (;;) {
    const code = makeBookingCode();
    const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM bookings WHERE code = ?', code);
    if (!row) return code;
  }
}

export async function addEvent(
  db: SQLiteDatabase,
  bookingId: number,
  status: BookingStatus,
  at: Millis,
  actorType: ActorType,
  actorId: number | null,
  extra: { dueAt?: Millis | null; comment?: string | null } = {},
): Promise<void> {
  await db.runAsync(
    `INSERT INTO status_events (booking_id, status, at, actor_type, actor_id, due_at, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    bookingId,
    status,
    at,
    actorType,
    actorId,
    extra.dueAt ?? null,
    extra.comment ?? null,
  );
}

async function onShelfCount(db: SQLiteDatabase, bookId: number): Promise<number> {
  const row = await db.getFirstAsync<{ total: number; busy: number | null }>(
    `SELECT b.copies_total AS total,
      (SELECT COUNT(*) FROM bookings k WHERE k.book_id = b.id AND k.status IN ('reserved', 'issued', 'overdue')) AS busy
     FROM books b WHERE b.id = ?`,
    bookId,
  );
  return row ? Math.max(0, row.total - (row.busy ?? 0)) : 0;
}

/** Освободился экземпляр: первый в очереди получает автобронь на queueHoldHours. */
export async function promoteQueue(db: SQLiteDatabase, bookId: number, at: Millis): Promise<void> {
  const settings = await getSettings();
  while ((await onShelfCount(db, bookId)) > 0) {
    const entry = await db.getFirstAsync<{ id: number; user_id: number }>(
      'SELECT id, user_id FROM queue_entries WHERE book_id = ? ORDER BY created_at, id LIMIT 1',
      bookId,
    );
    if (!entry) return;
    const code = await uniqueCode(db);
    const res = await db.runAsync(
      `INSERT INTO bookings (code, user_id, book_id, status, from_queue, reserved_at, pickup_until)
       VALUES (?, ?, ?, 'reserved', 1, ?, ?)`,
      code,
      entry.user_id,
      bookId,
      at,
      deadlineAt(at, settings.queueHoldHours, settings.closingTime),
    );
    await addEvent(db, res.lastInsertRowId, 'reserved', at, 'system', null);
    await db.runAsync('DELETE FROM queue_entries WHERE id = ?', entry.id);
  }
}

/**
 * Переводит статусы по времени: брони с истёкшим сроком → «Истекла» (и автобронь из очереди),
 * выдачи с прошедшим сроком возврата → «Просрочено» (в 00:00 следующего дня).
 */
export async function refreshStatuses(): Promise<void> {
  const db = await getDb();
  const t = now();
  const today = startOfDay(t);
  const expired = await db.getAllAsync<{ id: number; book_id: number; pickup_until: number }>(
    "SELECT id, book_id, pickup_until FROM bookings WHERE status = 'reserved' AND pickup_until < ?",
    t,
  );
  const overdue = await db.getAllAsync<{ id: number; due_at: number }>(
    "SELECT id, due_at FROM bookings WHERE status = 'issued' AND due_at < ?",
    today,
  );
  if (expired.length === 0 && overdue.length === 0) return;
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const b of expired) {
      await txn.runAsync("UPDATE bookings SET status = 'expired', expired_at = ? WHERE id = ?", b.pickup_until, b.id);
      await addEvent(txn, b.id, 'expired', b.pickup_until, 'system', null);
    }
    for (const b of overdue) {
      const at = startOfDay(b.due_at) + DAY;
      await txn.runAsync("UPDATE bookings SET status = 'overdue' WHERE id = ?", b.id);
      await addEvent(txn, b.id, 'overdue', at, 'system', null);
    }
    for (const bookId of new Set(expired.map((b) => b.book_id))) {
      await promoteQueue(txn, bookId, t);
    }
  });
}

const BOOKING_WITH_BOOK_SQL = `
  SELECT k.*, b.id AS b_id, b.title AS b_title, b.authors_full AS b_authors_full,
    b.authors_short AS b_authors_short, b.authors_info AS b_authors_info, b.isbn AS b_isbn, b.year AS b_year,
    b.copies_total AS b_copies_total, b.cover_color AS b_cover_color, b.cover_uri AS b_cover_uri,
    b.topic AS b_topic, b.shelf AS b_shelf, b.added_at AS b_added_at,
    u.id AS u_id, u.role AS u_role, u.full_name AS u_full_name, u.group_name AS u_group_name, u.email AS u_email,
    u.telegram AS u_telegram, u.telegram_enabled AS u_telegram_enabled,
    u.password_changed_at AS u_password_changed_at, u.ticket_number AS u_ticket_number,
    u.avatar_uri AS u_avatar_uri, u.avatar_color AS u_avatar_color
  FROM bookings k
  JOIN books b ON b.id = k.book_id
  JOIN users u ON u.id = k.user_id
`;

type JoinedRow = BookingRow & { [K in keyof BookRow as `b_${K}`]: BookRow[K] } & {
  [K in keyof UserRow as `u_${K}`]: UserRow[K];
};

function pick<P extends string, T>(row: Record<string, unknown>, prefix: P): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  // Поля выбраны по префиксу из явно перечисленных в SQL колонок, их набор совпадает с T.
  return out as T;
}

export function toJoined(r: JoinedRow): BookingWithBookAndUser {
  return {
    ...toBooking(r),
    book: toBook(pick<'b_', BookRow>(r, 'b_')),
    user: toUser(pick<'u_', UserRow>(r, 'u_')),
  };
}

export async function queryJoined(sqlTail: string, ...params: (string | number | null)[]) {
  const db = await getDb();
  const rows = await db.getAllAsync<JoinedRow>(`${BOOKING_WITH_BOOK_SQL} ${sqlTail}`, ...params);
  return rows.map(toJoined);
}

// ───────── Карточка книги ─────────

/** Состояние карточки книги для текущего пользователя (spec.md, S4). «race» включается dev-флагом на экране. */
export type BookCardState =
  | 'available'
  | 'mine'
  | 'limit'
  | 'reserved'
  | 'issued'
  | 'overdueOther'
  | 'inQueue'
  | 'withMe';

export type BookCard = {
  book: BookWithAvailability;
  state: BookCardState;
  myBooking: BookingWithBook | null;
  queuePosition: number | null;
  /** Когда освободится забронированная другим книга. */
  reservedUntil: Millis | null;
  /** Когда вернут выданную другому книгу. */
  dueAt: Millis | null;
};

export async function getBookCard(bookId: number, userId: number | null): Promise<BookCard | null> {
  await refreshStatuses();
  const book = await getBook(bookId);
  if (!book) return null;
  const db = await getDb();
  const settings = await getSettings();

  let myBooking: BookingWithBook | null = null;
  let queuePosition: number | null = null;
  let reservedActive = 0;
  if (userId !== null) {
    const mine = await queryJoined(
      "WHERE k.user_id = ? AND k.book_id = ? AND k.status IN ('reserved', 'issued', 'overdue') ORDER BY k.id DESC LIMIT 1",
      userId,
      bookId,
    );
    myBooking = mine[0] ?? null;
    queuePosition = await getQueuePosition(userId, bookId);
    const row = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM bookings WHERE user_id = ? AND status = 'reserved'",
      userId,
    );
    reservedActive = row?.n ?? 0;
  }

  const others = await db.getFirstAsync<{ pickup: number | null; due: number | null; overdue: number | null }>(
    `SELECT MIN(CASE WHEN status = 'reserved' THEN pickup_until END) AS pickup,
      MIN(CASE WHEN status IN ('issued', 'overdue') THEN due_at END) AS due,
      SUM(status = 'overdue') AS overdue
     FROM bookings WHERE book_id = ? AND user_id != ?`,
    bookId,
    userId ?? -1,
  );

  let state: BookCardState;
  if (myBooking?.status === 'reserved') state = 'mine';
  else if (myBooking) state = 'withMe';
  else if (queuePosition !== null) state = 'inQueue';
  else if (book.availability.onShelf > 0) {
    state = userId !== null && reservedActive >= settings.maxActiveBookings ? 'limit' : 'available';
  } else if (book.availability.reserved > 0) state = 'reserved';
  else if ((others?.overdue ?? 0) > 0) state = 'overdueOther';
  else state = 'issued';

  return {
    book,
    state,
    myBooking,
    queuePosition,
    reservedUntil: others?.pickup ?? null,
    dueAt: others?.due ?? null,
  };
}

// ───────── Действия студента ─────────

export type CreateBookingResult =
  | { ok: true; bookingId: number }
  | { ok: false; error: 'limit' | 'unavailable' | 'alreadyMine' };

export async function createBooking(userId: number, bookId: number): Promise<CreateBookingResult> {
  await refreshStatuses();
  const db = await getDb();
  const settings = await getSettings();
  let result: CreateBookingResult = { ok: false, error: 'unavailable' };
  await db.withExclusiveTransactionAsync(async (txn) => {
    const mine = await txn.getFirstAsync<{ id: number }>(
      "SELECT id FROM bookings WHERE user_id = ? AND book_id = ? AND status IN ('reserved', 'issued', 'overdue')",
      userId,
      bookId,
    );
    if (mine) {
      result = { ok: false, error: 'alreadyMine' };
      return;
    }
    const active = await txn.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM bookings WHERE user_id = ? AND status = 'reserved'",
      userId,
    );
    if ((active?.n ?? 0) >= settings.maxActiveBookings) {
      result = { ok: false, error: 'limit' };
      return;
    }
    if ((await onShelfCount(txn, bookId)) === 0) {
      result = { ok: false, error: 'unavailable' };
      return;
    }
    const t = now();
    const code = await uniqueCode(txn);
    const res = await txn.runAsync(
      `INSERT INTO bookings (code, user_id, book_id, status, reserved_at, pickup_until)
       VALUES (?, ?, ?, 'reserved', ?, ?)`,
      code,
      userId,
      bookId,
      t,
      deadlineAt(t, settings.pickupHours, settings.closingTime),
    );
    await addEvent(txn, res.lastInsertRowId, 'reserved', t, 'student', userId);
    await txn.runAsync('DELETE FROM queue_entries WHERE user_id = ? AND book_id = ?', userId, bookId);
    result = { ok: true, bookingId: res.lastInsertRowId };
  });
  return result;
}

export async function cancelBooking(bookingId: number, userId: number): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const b = await txn.getFirstAsync<{ book_id: number }>(
      "SELECT book_id FROM bookings WHERE id = ? AND user_id = ? AND status = 'reserved'",
      bookingId,
      userId,
    );
    if (!b) return;
    const t = now();
    await txn.runAsync("UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?", t, bookingId);
    await addEvent(txn, bookingId, 'cancelled', t, 'student', userId);
    await promoteQueue(txn, b.book_id, t);
  });
}

/** «Я вернул книгу»: запись ждёт сверки, книга сразу снова доступна. */
export async function markReturned(bookingId: number, userId: number): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const b = await txn.getFirstAsync<{ book_id: number }>(
      "SELECT book_id FROM bookings WHERE id = ? AND user_id = ? AND status IN ('issued', 'overdue')",
      bookingId,
      userId,
    );
    if (!b) return;
    const t = now();
    await txn.runAsync(
      "UPDATE bookings SET status = 'awaiting_check', return_marked_at = ?, check_postponed = 0 WHERE id = ?",
      t,
      bookingId,
    );
    await addEvent(txn, bookingId, 'awaiting_check', t, 'student', userId);
    await promoteQueue(txn, b.book_id, t);
  });
}

// ───────── Очередь ─────────

export async function getQueuePosition(userId: number, bookId: number): Promise<number | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ user_id: number }>(
    'SELECT user_id FROM queue_entries WHERE book_id = ? ORDER BY created_at, id',
    bookId,
  );
  const idx = rows.findIndex((r) => r.user_id === userId);
  return idx === -1 ? null : idx + 1;
}

export async function joinQueue(userId: number, bookId: number): Promise<number> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO queue_entries (user_id, book_id, created_at) VALUES (?, ?, ?)',
    userId,
    bookId,
    now(),
  );
  return (await getQueuePosition(userId, bookId)) ?? 1;
}

export async function leaveQueue(userId: number, bookId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM queue_entries WHERE user_id = ? AND book_id = ?', userId, bookId);
}

// ───────── Мои брони ─────────

export type MyBookingItem =
  | { kind: 'booking'; booking: BookingWithBook }
  | { kind: 'queue'; book: BookWithAvailability; position: number; createdAt: Millis };

export type MyBookings = {
  active: MyBookingItem[];
  completed: BookingWithBook[];
  counts: { active: number; overdue: number; completed: number };
};

const ACTIVE_ORDER: Record<string, number> = { reserved: 0, queue: 1, issued: 2, overdue: 3 };

function itemDeadline(i: MyBookingItem): Millis {
  if (i.kind === 'queue') return i.createdAt;
  return i.booking.status === 'reserved' ? (i.booking.pickupUntil ?? 0) : (i.booking.dueAt ?? 0);
}

function completedAt(b: BookingWithBook): Millis {
  return b.returnMarkedAt ?? b.closedAt ?? b.expiredAt ?? b.cancelledAt ?? 0;
}

/** Порядок активных — как в макете: ждут выдачи, очередь, выданы, просрочены; внутри — по сроку. */
export async function getMyBookings(userId: number): Promise<MyBookings> {
  await refreshStatuses();
  const db = await getDb();
  const bookings = await queryJoined('WHERE k.user_id = ? ORDER BY k.id DESC', userId);
  const queueRows = await db.getAllAsync<{ book_id: number; created_at: number }>(
    'SELECT book_id, created_at FROM queue_entries WHERE user_id = ?',
    userId,
  );

  const active: MyBookingItem[] = bookings
    .filter((b) => b.status === 'reserved' || b.status === 'issued' || b.status === 'overdue')
    .map((booking) => ({ kind: 'booking', booking }));
  for (const q of queueRows) {
    const book = await getBook(q.book_id);
    const position = await getQueuePosition(userId, q.book_id);
    if (book && position !== null) active.push({ kind: 'queue', book, position, createdAt: q.created_at });
  }
  active.sort((a, b) => {
    const ka = a.kind === 'queue' ? 'queue' : a.booking.status;
    const kb = b.kind === 'queue' ? 'queue' : b.booking.status;
    return ACTIVE_ORDER[ka] - ACTIVE_ORDER[kb] || itemDeadline(a) - itemDeadline(b);
  });

  const since = addDays(startOfDay(now()), -30);
  const completed = bookings
    .filter((b) => ['awaiting_check', 'closed', 'expired', 'cancelled'].includes(b.status))
    .filter((b) => completedAt(b) >= since)
    .sort((a, b) => completedAt(b) - completedAt(a));

  return {
    active,
    completed,
    counts: {
      active: active.length,
      overdue: active.filter((i) => i.kind === 'booking' && i.booking.status === 'overdue').length,
      completed: completed.length,
    },
  };
}

/** Данные для главной: баннер о самой важной брони и бейдж таб-бара. */
export type HomeSummary = {
  banner: BookingWithBook | null;
  otherActive: number;
  activeCount: number;
  overdueCount: number;
};

export async function getHomeSummary(userId: number): Promise<HomeSummary> {
  const mine = await getMyBookings(userId);
  const bookings = mine.active.flatMap((i) => (i.kind === 'booking' ? [i.booking] : []));
  const priority = (b: BookingWithBook) =>
    b.status === 'overdue' ? 0 : b.status === 'reserved' && b.fromQueue ? 1 : b.status === 'reserved' ? 2 : 3;
  const deadline = (b: BookingWithBook) => itemDeadline({ kind: 'booking', booking: b });
  const banner = [...bookings].sort((a, b) => priority(a) - priority(b) || deadline(a) - deadline(b))[0] ?? null;
  return {
    banner,
    otherActive: banner ? mine.counts.active - 1 : 0,
    activeCount: mine.counts.active,
    overdueCount: mine.counts.overdue,
  };
}

// ───────── Детали брони ─────────

export async function getBooking(bookingId: number): Promise<BookingWithBookAndUser | null> {
  await refreshStatuses();
  const rows = await queryJoined('WHERE k.id = ?', bookingId);
  return rows[0] ?? null;
}

export async function getStatusHistory(bookingId: number): Promise<StatusEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<StatusEventRow>(
    `SELECT e.*, u.full_name AS actor_name FROM status_events e
     LEFT JOIN users u ON u.id = e.actor_id
     WHERE e.booking_id = ? ORDER BY e.at, e.id`,
    bookingId,
  );
  return rows.map(toStatusEvent);
}
