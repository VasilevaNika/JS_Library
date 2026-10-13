// Тестовые данные для первого запуска. Основа — тексты макетов (16 сентября в макетах = «сегодня» здесь),
// все даты считаются от текущего дня, чтобы сроки выглядели как в макетах.
import type { SQLiteDatabase } from 'expo-sqlite';

import { bookSearchText } from '@/db/mappers';
import { hashPassword, makeSalt } from '@/db/password';
import { SETTINGS_KEYS } from '@/db/settingsKeys';
import { dayAt, DAY, HOUR, startOfDay } from '@/db/time';
import type { BookingStatus, LibrarySettings } from '@/db/types';
import type { CoverColor } from '@/theme/tokens';

/** Пароль всех тестовых аккаунтов. Вход студента: anna.smirnova@mail.ru, модератора: moderator@campus.test. */
export const TEST_PASSWORD = 'library2026';

/** Значения вместо плейсхолдеров макета «[…]» (spec.md, Q9). */
const SETTINGS: LibrarySettings = {
  location: 'Абонемент, 2 этаж',
  locationShort: '2 этаж',
  hours: 'пн–пт 10:00–20:00',
  closingTime: '20:00',
  pickupHours: 48,
  loanDays: 14,
  maxActiveBookings: 3,
  queueHoldHours: 24,
  rulesUrl: null,
};

type SeedUser = {
  key: string;
  role: 'student' | 'moderator';
  fullName: string;
  group: string | null;
  email: string;
  telegram: string | null;
  color: CoverColor;
  ticket: string | null;
};

const USERS: SeedUser[] = [
  { key: 'anna', role: 'student', fullName: 'Анна Смирнова', group: 'ПМ-21', email: 'anna.smirnova@mail.ru', telegram: 'anna_smirnova', color: 'teal', ticket: '21-0417' },
  { key: 'sofia', role: 'student', fullName: 'Софья Волкова', group: 'ЭК-21', email: 'sofia.volkova@mail.ru', telegram: null, color: 'terracotta', ticket: '21-0388' },
  { key: 'nikita', role: 'student', fullName: 'Никита Павлов', group: 'ФИ-22', email: 'nikita.pavlov@mail.ru', telegram: null, color: 'violet', ticket: '22-0153' },
  { key: 'maria', role: 'student', fullName: 'Мария Лебедева', group: 'ФИ-23', email: 'maria.lebedeva@mail.ru', telegram: null, color: 'sky', ticket: '23-0071' },
  { key: 'artem', role: 'student', fullName: 'Артём Зайцев', group: 'ИВТ-21', email: 'artem.zaitsev@mail.ru', telegram: null, color: 'green', ticket: '21-0502' },
  { key: 'polina', role: 'student', fullName: 'Полина Соколова', group: 'ЭК-22', email: 'polina.sokolova@mail.ru', telegram: null, color: 'rose', ticket: '22-0219' },
  { key: 'vera', role: 'student', fullName: 'Вера Новикова', group: 'ПМ-21', email: 'vera.novikova@mail.ru', telegram: null, color: 'ochre', ticket: '21-0431' },
  { key: 'timur', role: 'student', fullName: 'Тимур Исаев', group: 'ИВТ-23', email: 'timur.isaev@mail.ru', telegram: null, color: 'graphite', ticket: '23-0114' },
  { key: 'ekaterina', role: 'student', fullName: 'Екатерина Морозова', group: 'ПМ-23', email: 'ekaterina.morozova@mail.ru', telegram: null, color: 'terracotta', ticket: '23-0096' },
  { key: 'gleb', role: 'student', fullName: 'Глеб Фёдоров', group: 'ФИ-21', email: 'gleb.fedorov@mail.ru', telegram: null, color: 'sky', ticket: '21-0266' },
  { key: 'moderator', role: 'moderator', fullName: 'Ирина Максимова', group: null, email: 'moderator@campus.test', telegram: null, color: 'teal', ticket: null },
];

const SHELF_MATH = 'Стеллаж 3 · Математика и физика';
const SHELF_PROG = 'Стеллаж 5 · Программирование';

type SeedBook = {
  key: string;
  title: string;
  full: string;
  short: string;
  info: string;
  isbn: string;
  year: number;
  copies: number;
  color: CoverColor;
  topic: string;
  shelf: string;
};

const BOOKS: SeedBook[] = [
  { key: 'clrs', title: 'Алгоритмы. Построение и анализ', full: 'Т. Кормен, Ч. Лейзерсон, Р. Ривест, К. Штайн', short: 'Т. Кормен и др.', info: 'Кормен, Лейзерсон и др.', isbn: '978-5-8459-2016-4', year: 2019, copies: 5, color: 'teal', topic: 'Программирование', shelf: SHELF_PROG },
  { key: 'cpp', title: 'Алгоритмы на C++', full: 'Р. Седжвик', short: 'Р. Седжвик', info: 'Седжвик', isbn: '978-5-8459-2070-6', year: 2016, copies: 2, color: 'terracotta', topic: 'Программирование', shelf: SHELF_PROG },
  { key: 'grok', title: 'Грокаем алгоритмы', full: 'А. Бхаргава', short: 'А. Бхаргава', info: 'Бхаргава', isbn: '978-5-4461-0923-4', year: 2022, copies: 4, color: 'mustard', topic: 'Программирование', shelf: SHELF_PROG },
  { key: 'knuth', title: 'Искусство программирования. Том 1', full: 'Д. Кнут', short: 'Д. Кнут', info: 'Кнут', isbn: '978-5-8459-1984-7', year: 2017, copies: 2, color: 'graphite', topic: 'Программирование', shelf: SHELF_PROG },
  { key: 'net', title: 'Компьютерные сети', full: 'Э. Таненбаум', short: 'Э. Таненбаум', info: 'Таненбаум', isbn: '978-5-4461-1766-6', year: 2021, copies: 3, color: 'sky', topic: 'Программирование', shelf: SHELF_PROG },
  { key: 'fikh', title: 'Курс дифференциального и интегрального исчисления. Т. 1', full: 'Г. Фихтенгольц', short: 'Г. Фихтенгольц', info: 'Фихтенгольц', isbn: '978-5-8114-0673-9', year: 2020, copies: 2, color: 'green', topic: 'Математика', shelf: SHELF_MATH },
  { key: 'zorich', title: 'Математический анализ. Часть I', full: 'В. Зорич', short: 'В. Зорич', info: 'Зорич', isbn: '978-5-4439-4029-8', year: 2019, copies: 4, color: 'green', topic: 'Математика', shelf: SHELF_MATH },
  { key: 'mech', title: 'Механика', full: 'Л. Ландау, Е. Лифшиц', short: 'Л. Ландау, Е. Лифшиц', info: 'Ландау, Лифшиц', isbn: '978-5-9221-0819-5', year: 2017, copies: 3, color: 'ochre', topic: 'Физика', shelf: SHELF_MATH },
  { key: 'rough', title: 'Совершенный алгоритм. Основы', full: 'Т. Рафгарден', short: 'Т. Рафгарден', info: 'Рафгарден', isbn: '978-5-4461-1272-2', year: 2019, copies: 1, color: 'violet', topic: 'Программирование', shelf: SHELF_PROG },
  { key: 'gmurman', title: 'Теория вероятностей и математическая статистика', full: 'В. Гмурман', short: 'В. Гмурман', info: 'Гмурман', isbn: '978-5-9916-3461-8', year: 2018, copies: 2, color: 'rose', topic: 'Математика', shelf: SHELF_MATH },
  { key: 'demid', title: 'Сборник задач по математическому анализу', full: 'Б. Демидович', short: 'Б. Демидович', info: 'Демидович', isbn: '978-5-8114-0675-3', year: 2021, copies: 3, color: 'mustard', topic: 'Математика', shelf: SHELF_MATH },
];

/** Сроки — смещение в днях от сегодня и время дня. */
type At = [days: number, h: number, m?: number];

type SeedBooking = {
  code: string;
  user: string;
  book: string;
  status: BookingStatus;
  reserved?: At;
  pickup?: At;
  issued?: At;
  /** Срок возврата — смещение в днях (дата без времени). */
  due?: number;
  returned?: At;
  closed?: At;
  cancelled?: At;
  fromQueue?: boolean;
  reminder?: At;
};

const BOOKINGS: SeedBooking[] = [
  // Анна — все статусы «Моих броней»
  { code: '7KQ4MX', user: 'anna', book: 'clrs', status: 'reserved', reserved: [0, 20], pickup: [2, 20] },
  { code: '9RT2WE', user: 'anna', book: 'rough', status: 'issued', reserved: [-3, 12], issued: [-2, 15, 10], due: 12 },
  { code: '3HD7QA', user: 'anna', book: 'grok', status: 'overdue', reserved: [-18, 14, 2], issued: [-18, 17, 40], due: -4, reminder: [-3, 10] },
  { code: '5MV8KD', user: 'anna', book: 'mech', status: 'awaiting_check', reserved: [-16, 11], issued: [-15, 13], due: -1, returned: [-1, 16, 20] },
  { code: '2BX6NP', user: 'anna', book: 'zorich', status: 'closed', reserved: [-24, 10], issued: [-23, 12], due: -9, returned: [-6, 14], closed: [-6, 18] },
  { code: '4PL8RT', user: 'anna', book: 'net', status: 'expired', reserved: [-10, 20], pickup: [-8, 20] },
  { code: '8WQ3ZL', user: 'anna', book: 'gmurman', status: 'cancelled', reserved: [-12, 9], cancelled: [-11, 13] },

  // Журнал: просрочки, сверка, брони, выдачи
  { code: '6TF2HM', user: 'sofia', book: 'gmurman', status: 'overdue', reserved: [-22, 10], issued: [-21, 12], due: -7, reminder: [-6, 10] },
  { code: '7NC5YB', user: 'nikita', book: 'fikh', status: 'overdue', reserved: [-17, 9], issued: [-17, 15], due: -3, reminder: [-2, 10] },
  { code: '2KJ9VS', user: 'maria', book: 'mech', status: 'awaiting_check', reserved: [-16, 9], issued: [-15, 11], due: -1, returned: [-1, 12] },
  { code: '9HP4RA', user: 'artem', book: 'net', status: 'awaiting_check', reserved: [-14, 13], issued: [-14, 16], due: 0, returned: [0, 9, 30] },
  { code: '3GW7EX', user: 'polina', book: 'demid', status: 'awaiting_check', reserved: [-12, 10], issued: [-11, 14], due: 3, returned: [0, 11] },
  { code: '5LZ2QT', user: 'vera', book: 'knuth', status: 'reserved', reserved: [-1, 18, 30], pickup: [1, 18, 30] },
  { code: '8ME6UC', user: 'timur', book: 'cpp', status: 'reserved', reserved: [-1, 18, 30], pickup: [1, 18, 30] },
  { code: '4YA8BN', user: 'ekaterina', book: 'cpp', status: 'reserved', reserved: [0, 12], pickup: [2, 12] },
  { code: '6DS3KG', user: 'ekaterina', book: 'zorich', status: 'issued', reserved: [-7, 11], issued: [-6, 14], due: 8 },
  { code: '7VB2PJ', user: 'gleb', book: 'mech', status: 'closed', reserved: [-28, 10], issued: [-27, 12], due: -13, returned: [-14, 15], closed: [-13, 17] },

  // Выданные экземпляры — чтобы наличие совпадало с каталогом макета
  { code: '2QR8LS', user: 'sofia', book: 'clrs', status: 'issued', reserved: [-9, 10], issued: [-9, 14], due: 5 },
  { code: '3WE5TN', user: 'nikita', book: 'clrs', status: 'issued', reserved: [-6, 12], issued: [-5, 11], due: 9 },
  { code: '9PK4FD', user: 'polina', book: 'clrs', status: 'issued', reserved: [-4, 9], issued: [-3, 10], due: 11 },
  { code: '4XN7GH', user: 'maria', book: 'net', status: 'issued', reserved: [-8, 13], issued: [-7, 15], due: 7 },
  { code: '6JT9MW', user: 'timur', book: 'net', status: 'issued', reserved: [-6, 9], issued: [-6, 12], due: 8 },
  { code: '8CU3RV', user: 'vera', book: 'fikh', status: 'issued', reserved: [-8, 10], issued: [-8, 16], due: 6 },
  { code: '5BH6ZE', user: 'artem', book: 'zorich', status: 'issued', reserved: [-5, 15], issued: [-4, 10], due: 10 },
  { code: '2FM8YK', user: 'polina', book: 'mech', status: 'issued', reserved: [-3, 11], issued: [-2, 12], due: 12 },
];

/** Очередь за «Алгоритмами на C++»: Анна — 2-я. */
const QUEUE: { user: string; book: string; created: At }[] = [
  { user: 'gleb', book: 'cpp', created: [-2, 10] },
  { user: 'anna', book: 'cpp', created: [-1, 12, 30] },
];

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const today = startOfDay(Date.now());
  const at = (a: At) => dayAt(today, a[0], a[1], a[2] ?? 0);

  for (const [field, key] of Object.entries(SETTINGS_KEYS) as [keyof LibrarySettings, string][]) {
    const v = SETTINGS[field];
    if (v !== null) await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', key, String(v));
  }

  const userIds = new Map<string, number>();
  for (const u of USERS) {
    const salt = makeSalt();
    const res = await db.runAsync(
      `INSERT INTO users (role, full_name, group_name, email, telegram, telegram_enabled, password_hash,
        password_salt, password_changed_at, ticket_number, avatar_color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      u.role,
      u.fullName,
      u.group,
      u.email,
      u.telegram,
      u.telegram ? 1 : 0,
      await hashPassword(TEST_PASSWORD, salt),
      salt,
      today - 14 * DAY,
      u.ticket,
      u.color,
    );
    userIds.set(u.key, res.lastInsertRowId);
  }
  const moderatorId = userIds.get('moderator') ?? null;

  const bookIds = new Map<string, number>();
  for (const [i, b] of BOOKS.entries()) {
    const res = await db.runAsync(
      `INSERT INTO books (title, authors_full, authors_short, authors_info, isbn, year, copies_total, cover_color,
        topic, shelf, added_at, search_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      b.title,
      b.full,
      b.short,
      b.info,
      b.isbn,
      b.year,
      b.copies,
      b.color,
      b.topic,
      b.shelf,
      today - (400 - i) * DAY,
      bookSearchText({ title: b.title, authorsFull: b.full, isbn: b.isbn, topic: b.topic }),
    );
    bookIds.set(b.key, res.lastInsertRowId);
  }

  for (const k of BOOKINGS) {
    const userId = userIds.get(k.user);
    const bookId = bookIds.get(k.book);
    if (userId === undefined || bookId === undefined) throw new Error(`Seed: нет ${k.user} или ${k.book}`);
    const reservedAt = k.reserved ? at(k.reserved) : null;
    const pickupUntil = k.pickup ? at(k.pickup) : reservedAt !== null ? reservedAt + 48 * HOUR : null;
    const issuedAt = k.issued ? at(k.issued) : null;
    const dueAt = k.due !== undefined ? dayAt(today, k.due, 0) : null;
    const returnedAt = k.returned ? at(k.returned) : null;
    const closedAt = k.closed ? at(k.closed) : null;
    const cancelledAt = k.cancelled ? at(k.cancelled) : null;
    const expiredAt = k.status === 'expired' ? pickupUntil : null;
    const res = await db.runAsync(
      `INSERT INTO bookings (code, user_id, book_id, status, from_queue, reserved_at, pickup_until, issued_at, due_at,
        return_marked_at, closed_at, cancelled_at, expired_at, reminder_sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      k.code,
      userId,
      bookId,
      k.status,
      k.fromQueue ? 1 : 0,
      reservedAt,
      pickupUntil,
      issuedAt,
      dueAt,
      returnedAt,
      closedAt,
      cancelledAt,
      expiredAt,
      k.reminder ? at(k.reminder) : null,
    );
    const id = res.lastInsertRowId;
    const event = (status: BookingStatus, t: number, actor: 'student' | 'moderator' | 'system', due: number | null = null) =>
      db.runAsync(
        'INSERT INTO status_events (booking_id, status, at, actor_type, actor_id, due_at) VALUES (?, ?, ?, ?, ?, ?)',
        id,
        status,
        t,
        actor,
        actor === 'student' ? userId : actor === 'moderator' ? moderatorId : null,
        due,
      );
    if (reservedAt !== null) await event('reserved', reservedAt, 'student');
    if (issuedAt !== null) await event('issued', issuedAt, 'moderator', dueAt);
    if (dueAt !== null && dueAt + DAY <= Date.now() && (k.status === 'overdue' || (returnedAt !== null && returnedAt > dueAt + DAY))) {
      await event('overdue', dueAt + DAY, 'system');
    }
    if (returnedAt !== null) await event('awaiting_check', returnedAt, 'student');
    if (closedAt !== null) await event('closed', closedAt, 'moderator');
    if (cancelledAt !== null) await event('cancelled', cancelledAt, 'student');
    if (expiredAt !== null) await event('expired', expiredAt, 'system');
  }

  for (const q of QUEUE) {
    await db.runAsync(
      'INSERT INTO queue_entries (user_id, book_id, created_at) VALUES (?, ?, ?)',
      userIds.get(q.user) ?? null,
      bookIds.get(q.book) ?? null,
      at(q.created),
    );
  }
}
