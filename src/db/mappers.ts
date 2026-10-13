// Преобразование строк SQLite (snake_case) в доменные типы (camelCase).
import type { CoverColor } from '@/theme/tokens';

import type { ActorType, Book, Booking, BookingStatus, StatusEvent, User, UserRole } from './types';

export type UserRow = {
  id: number;
  role: string;
  full_name: string;
  group_name: string | null;
  email: string;
  telegram: string | null;
  telegram_enabled: number;
  password_changed_at: number;
  ticket_number: string | null;
  avatar_uri: string | null;
  avatar_color: string;
};

export type BookRow = {
  id: number;
  title: string;
  authors_full: string;
  authors_short: string;
  authors_info: string;
  isbn: string | null;
  year: number | null;
  copies_total: number;
  cover_color: string;
  cover_uri: string | null;
  topic: string;
  shelf: string;
  added_at: number;
};

export type BookingRow = {
  id: number;
  code: string;
  user_id: number;
  book_id: number;
  status: string;
  from_queue: number;
  reserved_at: number | null;
  pickup_until: number | null;
  issued_at: number | null;
  due_at: number | null;
  return_marked_at: number | null;
  closed_at: number | null;
  cancelled_at: number | null;
  expired_at: number | null;
  reminder_sent_at: number | null;
  check_postponed: number;
};

export type StatusEventRow = {
  id: number;
  booking_id: number;
  status: string;
  at: number;
  actor_type: string;
  actor_id: number | null;
  actor_name: string | null;
  due_at: number | null;
  comment: string | null;
};

// Значения перечислений в базе ограничены CHECK-констрейнтами схемы,
// поэтому приведение строк к union-типам ниже безопасно.

export function toUser(r: UserRow): User {
  return {
    id: r.id,
    role: r.role as UserRole,
    fullName: r.full_name,
    groupName: r.group_name,
    email: r.email,
    telegram: r.telegram,
    telegramEnabled: r.telegram_enabled === 1,
    passwordChangedAt: r.password_changed_at,
    ticketNumber: r.ticket_number,
    avatarUri: r.avatar_uri,
    avatarColor: r.avatar_color as CoverColor,
  };
}

export function toBook(r: BookRow): Book {
  return {
    id: r.id,
    title: r.title,
    authorsFull: r.authors_full,
    authorsShort: r.authors_short,
    authorsInfo: r.authors_info,
    isbn: r.isbn,
    year: r.year,
    copiesTotal: r.copies_total,
    coverColor: r.cover_color as CoverColor,
    coverUri: r.cover_uri,
    topic: r.topic,
    shelf: r.shelf,
    addedAt: r.added_at,
  };
}

export function toBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    code: r.code,
    userId: r.user_id,
    bookId: r.book_id,
    status: r.status as BookingStatus,
    fromQueue: r.from_queue === 1,
    reservedAt: r.reserved_at,
    pickupUntil: r.pickup_until,
    issuedAt: r.issued_at,
    dueAt: r.due_at,
    returnMarkedAt: r.return_marked_at,
    closedAt: r.closed_at,
    cancelledAt: r.cancelled_at,
    expiredAt: r.expired_at,
    reminderSentAt: r.reminder_sent_at,
    checkPostponed: r.check_postponed === 1,
  };
}

export function toStatusEvent(r: StatusEventRow): StatusEvent {
  return {
    id: r.id,
    bookingId: r.booking_id,
    status: r.status as BookingStatus,
    at: r.at,
    actorType: r.actor_type as ActorType,
    actorId: r.actor_id,
    actorName: r.actor_name,
    dueAt: r.due_at,
    comment: r.comment,
  };
}

/** Строка поиска: нижний регистр, ё → е. SQLite lower() не работает с кириллицей. */
export function normalizeSearch(s: string): string {
  return s.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

export function bookSearchText(b: { title: string; authorsFull: string; isbn: string | null; topic: string }): string {
  return normalizeSearch([b.title, b.authorsFull, b.isbn ?? '', (b.isbn ?? '').replace(/-/g, ''), b.topic].join(' '));
}
