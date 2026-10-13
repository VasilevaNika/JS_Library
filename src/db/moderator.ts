// Журнал, выдача и сверка (модератор).
import { addEvent, promoteQueue, queryJoined, refreshStatuses, uniqueCode } from './bookings';
import { getDb } from './client';
import { normalizeSearch } from './mappers';
import { getSettings } from './settings';
import { addDays, now, startOfDay } from './time';
import type { BookingStatus, BookingWithBookAndUser, Millis } from './types';

// ───────── Журнал ─────────

/** Фильтры журнала. «Закрыто» включает и отменённые студентом брони. */
export type JournalFilter = 'all' | 'reserved' | 'issued' | 'overdue' | 'awaiting_check' | 'expired' | 'closed';

export const JOURNAL_FILTERS: readonly JournalFilter[] = [
  'all',
  'reserved',
  'issued',
  'overdue',
  'awaiting_check',
  'expired',
  'closed',
];

function filterOf(status: BookingStatus): Exclude<JournalFilter, 'all'> {
  return status === 'cancelled' ? 'closed' : status;
}

/** «Сначала самые срочные»: просрочки, сверка, брони, выдачи, затем завершённые. */
const URGENCY: Record<BookingStatus, number> = {
  overdue: 0,
  awaiting_check: 1,
  reserved: 2,
  issued: 3,
  expired: 4,
  closed: 5,
  cancelled: 5,
};

function urgencyDate(b: BookingWithBookAndUser): Millis {
  switch (b.status) {
    case 'overdue':
    case 'issued':
      return b.dueAt ?? 0;
    case 'awaiting_check':
      return b.returnMarkedAt ?? 0;
    case 'reserved':
      return b.pickupUntil ?? 0;
    default:
      return -(b.closedAt ?? b.expiredAt ?? b.cancelledAt ?? 0);
  }
}

export type JournalPage = {
  rows: BookingWithBookAndUser[];
  total: number;
  counts: Record<JournalFilter, number>;
};

/** `filters` — выбранные чипы; пусто или 'all' — все записи. Можно выбрать несколько (дизайн-система). */
export async function getJournal(filters: JournalFilter[], query = ''): Promise<JournalPage> {
  await refreshStatuses();
  const all = await queryJoined('');
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  const matched = words.length
    ? all.filter((b) => {
        const hay = normalizeSearch(
          [b.user.fullName, b.user.groupName ?? '', b.book.title, b.book.isbn ?? '', b.code].join(' '),
        );
        return words.every((w) => hay.includes(w));
      })
    : all;

  const counts = Object.fromEntries(JOURNAL_FILTERS.map((f) => [f, 0])) as Record<JournalFilter, number>;
  for (const b of matched) {
    counts.all++;
    counts[filterOf(b.status)]++;
  }

  const rows = matched
    .filter((b) => filters.length === 0 || filters.includes('all') || filters.includes(filterOf(b.status)))
    .sort((a, b) => URGENCY[a.status] - URGENCY[b.status] || urgencyDate(a) - urgencyDate(b));

  return { rows, total: matched.length, counts };
}

// ───────── Выдача ─────────

export type IssueLookup =
  | { kind: 'found'; bookings: BookingWithBookAndUser[] }
  | { kind: 'expired'; booking: BookingWithBookAndUser; bookAvailable: boolean }
  | { kind: 'notFound'; query: string };

/** Поиск по коду брони (как в QR) или по имени студента. */
export async function lookupForIssue(input: string): Promise<IssueLookup> {
  await refreshStatuses();
  const query = input.trim();
  const code = query.replace(/\s+/g, '').toUpperCase();
  if (!code) return { kind: 'notFound', query };

  const byCode = await queryJoined('WHERE k.code = ?', code);
  if (byCode.length) {
    const b = byCode[0];
    if (b.status === 'reserved') return { kind: 'found', bookings: [b] };
    if (b.status === 'expired') {
      const db = await getDb();
      const row = await db.getFirstAsync<{ total: number; busy: number }>(
        `SELECT b.copies_total AS total,
          (SELECT COUNT(*) FROM bookings k WHERE k.book_id = b.id AND k.status IN ('reserved', 'issued', 'overdue')) AS busy
         FROM books b WHERE b.id = ?`,
        b.bookId,
      );
      return { kind: 'expired', booking: b, bookAvailable: !!row && row.total - row.busy > 0 };
    }
    return { kind: 'notFound', query };
  }

  const words = normalizeSearch(query).split(' ').filter(Boolean);
  const reserved = await queryJoined("WHERE k.status = 'reserved' ORDER BY k.pickup_until");
  const byName = reserved.filter((b) => {
    const name = normalizeSearch(b.user.fullName);
    return words.every((w) => name.includes(w));
  });
  const users = new Set(byName.map((b) => b.userId));
  if (byName.length === 0 || users.size > 1) return { kind: 'notFound', query };
  return { kind: 'found', bookings: byName };
}

export async function defaultDueDate(from: Millis = now()): Promise<Millis> {
  const settings = await getSettings();
  return startOfDay(addDays(from, settings.loanDays));
}

export async function issueBookings(bookingIds: number[], dueAt: Millis, moderatorId: number): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const t = now();
    for (const id of bookingIds) {
      const res = await txn.runAsync(
        "UPDATE bookings SET status = 'issued', issued_at = ?, due_at = ? WHERE id = ? AND status = 'reserved'",
        t,
        dueAt,
        id,
      );
      if (res.changes > 0) await addEvent(txn, id, 'issued', t, 'moderator', moderatorId, { dueAt });
    }
  });
}

/** «Выдать без брони» — для истёкшей брони, если книга в наличии. */
export async function issueWithoutBooking(
  userId: number,
  bookId: number,
  dueAt: Millis,
  moderatorId: number,
): Promise<number> {
  const db = await getDb();
  let id = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const t = now();
    const code = await uniqueCode(txn);
    const res = await txn.runAsync(
      `INSERT INTO bookings (code, user_id, book_id, status, issued_at, due_at) VALUES (?, ?, ?, 'issued', ?, ?)`,
      code,
      userId,
      bookId,
      t,
      dueAt,
    );
    id = res.lastInsertRowId;
    await addEvent(txn, id, 'issued', t, 'moderator', moderatorId, { dueAt });
  });
  return id;
}

// ───────── Сверка (обход) ─────────

export type ReconciliationGroup = { shelf: string; items: BookingWithBookAndUser[] };

export type Reconciliation = {
  groups: ReconciliationGroup[];
  done: number;
  total: number;
};

/** Записи «Ожидает сверки» и «Просрочено», по стеллажам. Отложенные — в конце своей группы. */
export async function getReconciliation(): Promise<Reconciliation> {
  await refreshStatuses();
  const db = await getDb();
  // Сверенные сегодня записи (закрытые или с отмеченным расхождением) в список не попадают.
  const checked = await db.getAllAsync<{ booking_id: number }>(
    `SELECT DISTINCT booking_id FROM status_events
     WHERE actor_type = 'moderator' AND at >= ? AND status IN ('closed', 'overdue')`,
    startOfDay(now()),
  );
  const checkedIds = new Set(checked.map((r) => r.booking_id));
  const items = (
    await queryJoined("WHERE k.status IN ('awaiting_check', 'overdue') ORDER BY b.shelf, k.check_postponed, b.title")
  ).filter((it) => !checkedIds.has(it.id));
  const groups: ReconciliationGroup[] = [];
  for (const it of items) {
    const g = groups.find((x) => x.shelf === it.book.shelf);
    if (g) g.items.push(it);
    else groups.push({ shelf: it.book.shelf, items: [it] });
  }
  return { groups, done: checkedIds.size, total: checkedIds.size + items.length };
}

/** «На полке — закрыть». */
export async function closeOnShelf(bookingId: number, moderatorId: number): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const b = await txn.getFirstAsync<{ book_id: number; status: string }>(
      "SELECT book_id, status FROM bookings WHERE id = ? AND status IN ('awaiting_check', 'overdue')",
      bookingId,
    );
    if (!b) return;
    const t = now();
    await txn.runAsync(
      "UPDATE bookings SET status = 'closed', closed_at = ?, check_postponed = 0 WHERE id = ?",
      t,
      bookingId,
    );
    await addEvent(txn, bookingId, 'closed', t, 'moderator', moderatorId);
    // Просроченная книга нашлась — экземпляр снова свободен.
    if (b.status === 'overdue') await promoteQueue(txn, b.book_id, t);
  });
}

/** «Нет на полке» → «Отметить расхождение»: запись снова «Просрочено», книга пропадает из наличия. */
export async function markMissing(bookingId: number, moderatorId: number, comment: string): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const t = now();
    const res = await txn.runAsync(
      "UPDATE bookings SET status = 'overdue', return_marked_at = NULL, check_postponed = 0 WHERE id = ? AND status IN ('awaiting_check', 'overdue')",
      bookingId,
    );
    if (res.changes > 0) {
      await addEvent(txn, bookingId, 'overdue', t, 'moderator', moderatorId, { comment: comment.trim() });
    }
  });
}

/** «Отложить» — запись уходит в конец своего стеллажа. */
export async function postponeCheck(bookingId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE bookings SET check_postponed = 1 WHERE id = ?', bookingId);
}

export async function getJournalRecord(bookingId: number): Promise<BookingWithBookAndUser | null> {
  const rows = await queryJoined('WHERE k.id = ?', bookingId);
  return rows[0] ?? null;
}
