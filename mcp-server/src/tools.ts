// Инструменты MCP-сервера. Каждый повторяет одну форму приложения: вызывает ту же функцию из src/db
// с теми же проверками и отвечает теми же текстами (src/db/messages.ts).
import { z } from 'zod';

import {
  addBook,
  bookInputErrorText,
  bookStateNotice,
  cancelBooking,
  checkImportRows,
  closeOnShelf,
  commitImport,
  createBooking,
  createBookingErrorText,
  defaultDueDate,
  duplicateIsbnText,
  expiredBookingText,
  findBookByIsbn,
  getActiveUsage,
  getBook,
  getBookCard,
  getBooking,
  getBookingByCode,
  getJournal,
  getMyBookings,
  getReconciliation,
  getSettings,
  IMPORT_ERROR_LABEL,
  issueBookings,
  issueNotFoundText,
  issueWithoutBooking,
  JOURNAL_FILTERS,
  joinQueue,
  leaveQueue,
  lookupForIssue,
  markMissing,
  markReturned,
  profileErrorText,
  registerErrorText,
  registerUser,
  removeBlockedText,
  removeBook,
  searchBooks,
  similarBooks,
  startOfDay,
  updateBook,
  updateProfile,
  type BookingWithBookAndUser,
  type BookInput,
  type ImportRow,
  type JournalFilter,
  type User,
} from '@/db';
import { JOURNAL_STATUS } from '@/lib/bookingStatus';
import { dayMonth, dayMonthTime, plural } from '@/lib/format';
import { declineName } from '@/lib/names';

import { currentUser, effectiveRole, UserError, type Context } from './context';
import { bookingLine, bookLine, CONFIRM_HINT, journalLine } from './format';

export type ToolRole = 'any' | 'student' | 'moderator';

export type ToolDef<S extends z.ZodRawShape> = {
  name: string;
  description: string;
  /** Кому доступен: 'any' — всем, остальные проверяются до вызова. */
  role: ToolRole;
  /** Меняет данные — такие вызовы пишутся в журнал mcp_audit. */
  mutating: boolean;
  input: S;
  run: (args: z.infer<z.ZodObject<S>>, ctx: Context, user: User | null) => Promise<string>;
};

/** Общий вид инструмента для списка: аргументы уже проверены схемой SDK, поэтому тип стирается. */
export type AnyTool = Omit<ToolDef<z.ZodRawShape>, 'run'> & {
  run: (args: Record<string, unknown>, ctx: Context, user: User | null) => Promise<string>;
};

function tool<S extends z.ZodRawShape>(def: ToolDef<S>): AnyTool {
  // Сужение типа аргументов делает схема input при вызове, см. server.ts.
  return def as unknown as AnyTool;
}

// ───────── Общие параметры ─────────

const confirm = z
  .boolean()
  .optional()
  .describe(
    'Подтверждение. Без него инструмент только расскажет, что сделает, и ничего не изменит. ' +
      'Передавайте true, только когда пользователь явно согласился. Пример: true',
  );

const bookId = z
  .number({ error: 'Номер книги — целое число из search_books, например 3.' })
  .int('Номер книги — целое число из search_books, например 3.')
  .positive('Номер книги — целое число из search_books, например 3.')
  .describe('Номер книги в каталоге (поле id из search_books). Пример: 3');

const code = z
  .string({ error: 'Код брони — 6 символов, например 7KQ4MX.' })
  .trim()
  .min(1, 'Код брони — 6 символов, например 7KQ4MX.')
  .describe('Код брони из QR — 6 символов, регистр и пробелы не важны. Пример: «7KQ4MX» или «7kq 4mx»');

// ───────── Помощники ─────────

async function bookOrFail(id: number) {
  const book = await getBook(id);
  if (!book) throw new UserError('Книга не найдена. Возможно, её убрали из каталога.');
  return book;
}

/** Бронь по коду: студент видит только свои, модератор — любые. */
async function bookingByCode(value: string, user: User, ctx: Context): Promise<BookingWithBookAndUser> {
  const b = await getBookingByCode(value);
  const visible = b && (b.userId === user.id || effectiveRole(ctx, user) === 'moderator');
  if (!visible) {
    const shown = value.replace(/\s+/g, '').toUpperCase();
    throw new UserError(
      effectiveRole(ctx, user) === 'moderator' ? issueNotFoundText(shown) : `Бронь с кодом ${shown} не найдена среди ваших броней.`,
    );
  }
  return b;
}

function statusRefusal(b: BookingWithBookAndUser, action: string): UserError {
  return new UserError(`Бронь ${b.code} на «${b.book.title}» нельзя ${action}: сейчас она в статусе «${JOURNAL_STATUS[b.status].label}».`);
}

/** «2026-10-28» → начало этого дня по местному времени. */
function parseDate(value: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  if (!d || !m || d.getMonth() !== Number(m[2]) - 1) {
    throw new UserError('Дата возврата — в формате ГГГГ-ММ-ДД, например 2026-10-28.');
  }
  return d.getTime();
}

// ───────── Чтение ─────────

const searchBooksTool = tool({
  name: 'search_books',
  description:
    'Поиск книг в каталоге — как строка поиска на главном экране. Ищет по названию, автору и ISBN, ' +
    'показывает, есть ли книга на полке. Если ничего не нашлось, предлагает похожие. ' +
    'Пример: «Найди книги по алгоритмам».',
  role: 'any',
  mutating: false,
  input: {
    query: z
      .string({ error: 'Укажите, что искать: название, автора или ISBN.' })
      .trim()
      .min(1, 'Укажите, что искать: название, автора или ISBN.')
      .describe('Что искать: название, автор или ISBN. Пример: «Грокаем алгоритмы», «Кормен», «978-5-4461-0923-4»'),
  },
  run: async ({ query }) => {
    const found = await searchBooks(query);
    if (found.length) {
      return `${found.length} ${plural(found.length, ['книга', 'книги', 'книг'])}:\n${found.map(bookLine).join('\n')}`;
    }
    const similar = await similarBooks(query);
    const tail = similar.length ? `\nПохожие:\n${similar.map(bookLine).join('\n')}` : '';
    return `Ничего не нашлось по запросу «${query}».${tail}`;
  },
});

const getBookTool = tool({
  name: 'get_book',
  description:
    'Карточка книги: авторы, год, ISBN, сколько на полке, выдано и в очереди, где стоит, ' +
    'и что сейчас может сделать текущий пользователь (забронировать, встать в очередь…). ' +
    'Пример: «Расскажи про книгу 3».',
  role: 'any',
  mutating: false,
  input: { book_id: bookId },
  run: async ({ book_id }, ctx) => {
    const user = ctx.email ? await currentUser(ctx).catch(() => null) : null;
    const card = await getBookCard(book_id, user && effectiveRole(ctx, user) === 'student' ? user.id : null);
    if (!card) throw new UserError('Книга не найдена. Возможно, её убрали из каталога.');
    const b = card.book;
    const settings = await getSettings();
    const notice = bookStateNotice(card, settings);
    const lines = [
      `«${b.title}» — ${b.authorsFull}`,
      `Год: ${b.year ?? '—'}. ISBN: ${b.isbn ?? '—'}.`,
      `Наличие: на полке ${b.availability.onShelf}, выдано ${b.availability.issued + b.availability.reserved}, очередь ${b.availability.queue}. Всего экземпляров: ${b.copiesTotal}.`,
      `Где: ${settings.location}${b.shelf ? `, ${b.shelf}` : ''}.`,
    ];
    if (notice) lines.push(notice.text);
    const can: Record<typeof card.state, string> = {
      available: 'Можно забронировать (create_booking).',
      mine: 'Книга уже забронирована вами.',
      limit: 'Забронировать нельзя — достигнут лимит броней.',
      reserved: 'Можно встать в очередь (join_queue).',
      issued: 'Можно встать в очередь (join_queue).',
      overdueOther: 'Можно встать в очередь (join_queue).',
      inQueue: 'Можно выйти из очереди (leave_queue).',
      withMe: 'Когда вернёте книгу на полку, отметьте возврат (return_book).',
    };
    if (user && effectiveRole(ctx, user) === 'student') lines.push(can[card.state]);
    return lines.join('\n');
  },
});

const listMyBookingsTool = tool({
  name: 'list_my_bookings',
  description:
    'Мои брони — как вкладка «Брони»: активные брони и выданные книги с кодами и сроками, ' +
    'очереди, в которых вы стоите, и завершённые. Пример: «Какие книги у меня сейчас?».',
  role: 'student',
  mutating: false,
  input: {},
  run: async (_args, _ctx, user) => {
    const mine = await getMyBookings(user!.id);
    const active = mine.active.map((i) =>
      i.kind === 'booking' ? bookingLine(i.booking) : `• Очередь за «${i.book.title}» (id ${i.book.id}): вы ${i.position}-й.`,
    );
    const done = mine.completed.slice(0, 10).map(bookingLine);
    return [
      `Активные (${mine.counts.active}${mine.counts.overdue ? `, из них просрочено ${mine.counts.overdue}` : ''}):`,
      active.length ? active.join('\n') : '• Активных броней нет.',
      `Завершённые (${mine.counts.completed}${mine.counts.completed > 10 ? ', показаны последние 10' : ''}):`,
      done.length ? done.join('\n') : '• Пока нет.',
    ].join('\n');
  },
});

const getBookingByCodeTool = tool({
  name: 'get_booking_by_code',
  description:
    'Бронь по коду из QR: книга, статус, сроки и история статусов. Студент видит только свои брони, ' +
    'модератор — любые. Пример: «Что с бронью 7KQ4MX?».',
  role: 'any',
  mutating: false,
  input: { code },
  run: async (args, ctx) => {
    const user = await currentUser(ctx);
    const b = await bookingByCode(args.code, user, ctx);
    const full = await getBooking(b.id);
    const lines = [effectiveRole(ctx, user) === 'moderator' ? journalLine(b) : bookingLine(b)];
    if (full) lines.push(`Где забрать: ${(await getSettings()).location}${b.book.shelf ? `, ${b.book.shelf}` : ''}.`);
    return lines.join('\n');
  },
});

const filterSchema = z.enum(JOURNAL_FILTERS as [JournalFilter, ...JournalFilter[]]);

const listJournalTool = tool({
  name: 'list_journal',
  description:
    'Журнал выдач модератора: все записи с читателями, статусами и сроками, сначала срочные. ' +
    'Можно отфильтровать по статусу и найти по имени, группе, названию, ISBN или коду. ' +
    'Только для модератора. Пример: «Покажи просроченные выдачи».',
  role: 'moderator',
  mutating: false,
  input: {
    filters: z
      .array(filterSchema)
      .optional()
      .describe(
        'Статусы: all — все, reserved — забронирована, issued — выдана, overdue — просрочено, ' +
          'awaiting_check — ожидает сверки, expired — истекла, closed — закрыта. Пример: ["overdue"]',
      ),
    query: z.string().optional().describe('Поиск по имени, группе, названию, ISBN или коду. Пример: «Смирнова»'),
  },
  run: async ({ filters, query }) => {
    const page = await getJournal(filters ?? [], query ?? '');
    const counts = JOURNAL_FILTERS.filter((f) => f !== 'all')
      .map((f) => `${f === 'closed' ? 'Закрыта' : JOURNAL_STATUS[f].label}: ${page.counts[f]}`)
      .join(', ');
    const rows = page.rows.slice(0, 30).map(journalLine);
    const more = page.rows.length > 30 ? `\n…и ещё ${page.rows.length - 30}. Уточните поиск.` : '';
    return `Записей: ${page.rows.length} (${counts}).\n${rows.length ? rows.join('\n') : 'Ничего не нашлось.'}${more}`;
  },
});

const listReconciliationTool = tool({
  name: 'list_reconciliation',
  description:
    'Список «Сверка» на экране выдачи: возвраты, которые читатели отметили сами («Ожидает сверки»), ' +
    'и просрочки — по стеллажам. Отсюда берут коды для check_return и mark_missing. ' +
    'Только для модератора. Пример: «Что нужно проверить на полках?».',
  role: 'moderator',
  mutating: false,
  input: {},
  run: async () => {
    const r = await getReconciliation();
    if (r.total === 0) return 'Все записи сверены. Просрочек нет. Следующий обход — по расписанию библиотеки.';
    const groups = r.groups.map((g) => `${g.shelf || 'Без стеллажа'}:\n${g.items.map(journalLine).join('\n')}`);
    return `Сверено ${r.done} из ${r.total}.\n${groups.join('\n')}`;
  },
});

// ───────── Действия читателя ─────────

const registerTool = tool({
  name: 'register',
  description:
    'Регистрация нового читателя — как вкладка «Регистрация» на экране входа. Проверяет почту и пароль ' +
    'теми же правилами. Чтобы потом действовать от имени нового читателя, его почту нужно указать в ' +
    'LIBRARY_USER_EMAIL. Пример: «Зарегистрируй Петра Иванова, petr@mail.ru».',
  role: 'any',
  mutating: true,
  input: {
    full_name: z.string().trim().min(1, 'Укажите имя и фамилию.').describe('Имя и фамилия. Пример: «Пётр Иванов»'),
    email: z.string().describe('Почта, она же логин. Пример: «petr@mail.ru»'),
    password: z.string().describe('Пароль, не короче 8 символов. Пример: «library2026»'),
    telegram: z.string().optional().describe('Ник в Telegram для уведомлений, можно без @. Пример: «petr_ivanov»'),
  },
  run: async ({ full_name, email, password, telegram }) => {
    const res = await registerUser({ fullName: full_name, email, password, telegram: telegram ?? '' });
    if (!res.ok) throw new UserError(res.errors.map(registerErrorText).join(' '));
    return `Читатель зарегистрирован: ${res.user.fullName}, ${res.user.email}.`;
  },
});

const createBookingTool = tool({
  name: 'create_booking',
  description:
    'Забронировать книгу — кнопка «Забронировать» в карточке книги. Книга ждёт читателя на абонементе ' +
    'ограниченное время, одновременно можно держать не больше нескольких броней. ' +
    'Номер книги берите из search_books. Пример: «Забронируй мне „Грокаем алгоритмы“».',
  role: 'student',
  mutating: true,
  input: { book_id: bookId },
  run: async ({ book_id }, _ctx, user) => {
    const book = await bookOrFail(book_id);
    const res = await createBooking(user!.id, book_id);
    const settings = await getSettings();
    if (!res.ok) throw new UserError(createBookingErrorText(res.error, settings));
    const b = await getBooking(res.bookingId);
    const until = b?.pickupUntil ? dayMonthTime(b.pickupUntil) : '';
    return (
      `Бронь оформлена: «${book.title}». Книга ждёт вас до ${until}.\n` +
      `Где: ${settings.location}${book.shelf ? `, ${book.shelf}` : ''}. Часы работы: ${settings.hours}.\n` +
      `Код брони: ${b?.code ?? ''} — покажите его на абонементе.`
    );
  },
});

const cancelBookingTool = tool({
  name: 'cancel_booking',
  description:
    'Отменить бронь — кнопка «Отменить бронь» на экране брони. Отменить можно только бронь, ' +
    'которая ждёт выдачи. Опасное действие: без confirm: true только описывает, что произойдёт. ' +
    'Пример: «Отмени бронь 7KQ4MX».',
  role: 'student',
  mutating: true,
  input: { code, confirm },
  run: async (args, ctx, user) => {
    const b = await bookingByCode(args.code, user!, ctx);
    if (b.status !== 'reserved') throw statusRefusal(b, 'отменить');
    if (!args.confirm) return `Отменить бронь на «${b.book.title}»? Книга сразу станет доступна другим.\n${CONFIRM_HINT}`;
    await cancelBooking(b.id, user!.id);
    return `Бронь ${b.code} на «${b.book.title}» отменена. Книга снова доступна другим.`;
  },
});

const joinQueueTool = tool({
  name: 'join_queue',
  description:
    'Встать в очередь за книгой, которой сейчас нет на полке, — кнопка «Встать в очередь». ' +
    'Когда книга освободится, читателю напишут и придержат её. Пример: «Поставь меня в очередь за книгой 7».',
  role: 'student',
  mutating: true,
  input: { book_id: bookId },
  run: async ({ book_id }, _ctx, user) => {
    const card = await getBookCard(book_id, user!.id);
    if (!card) throw new UserError('Книга не найдена. Возможно, её убрали из каталога.');
    const settings = await getSettings();
    if (!['reserved', 'issued', 'overdueOther'].includes(card.state)) {
      const notice = bookStateNotice(card, settings);
      throw new UserError(
        notice?.text ??
          (card.state === 'available' ? `«${card.book.title}» в наличии — очередь не нужна, книгу можно забронировать.` : 'Встать в очередь сейчас нельзя.'),
      );
    }
    const position = await joinQueue(user!.id, book_id);
    const hold = settings.queueHoldHours;
    return (
      `Вы ${position}-й в очереди за «${card.book.title}». Когда книга освободится, мы напишем на почту и в Telegram. ` +
      `У вас будет ${hold} ${plural(hold, ['час', 'часа', 'часов'])}, чтобы её забрать.`
    );
  },
});

const leaveQueueTool = tool({
  name: 'leave_queue',
  description:
    'Выйти из очереди за книгой — кнопка «Выйти из очереди». Если вернуться позже, место будет в конце. ' +
    'Пример: «Убери меня из очереди за книгой 7».',
  role: 'student',
  mutating: true,
  input: { book_id: bookId },
  run: async ({ book_id }, _ctx, user) => {
    const card = await getBookCard(book_id, user!.id);
    if (!card) throw new UserError('Книга не найдена. Возможно, её убрали из каталога.');
    if (card.state !== 'inQueue') throw new UserError(`Вас нет в очереди за «${card.book.title}».`);
    await leaveQueue(user!.id, book_id);
    return `Вы вышли из очереди за «${card.book.title}». Если вернётесь позже, встанете в конец очереди.`;
  },
});

const returnBookTool = tool({
  name: 'return_book',
  description:
    'Отметить, что книга возвращена на полку, — кнопка «Я вернул книгу» у читателя. Книга сразу ' +
    'появится в каталоге, библиотекарь проверит её при обходе. Опасное действие: без confirm: true ' +
    'только описывает, что произойдёт. Пример: «Я вернул книгу по брони 7KQ4MX».',
  role: 'student',
  mutating: true,
  input: { code, confirm },
  run: async (args, ctx, user) => {
    const b = await bookingByCode(args.code, user!, ctx);
    if (b.status !== 'issued' && b.status !== 'overdue') throw statusRefusal(b, 'отметить как возвращённую');
    const overdue = b.status === 'overdue' && b.dueAt ? ` Срок возврата прошёл ${dayMonth(b.dueAt)}.` : '';
    if (!args.confirm) {
      return (
        `Вы вернули «${b.book.title}» на полку?${overdue} Книга сразу появится в каталоге как доступная. ` +
        `Библиотекарь проверит её при обходе.\n${CONFIRM_HINT}`
      );
    }
    await markReturned(b.id, user!.id);
    return `Возврат «${b.book.title}» отмечен. Книга снова в каталоге, библиотекарь проверит её при обходе.`;
  },
});

const updateProfileTool = tool({
  name: 'update_profile',
  description:
    'Изменить профиль — экран «Редактировать профиль»: имя, группа, почта, Telegram. Передавайте только ' +
    'то, что меняется. Если меняется почта, её нужно поменять и в LIBRARY_USER_EMAIL. ' +
    'Пример: «Поменяй мою группу на ИВТ-21».',
  role: 'any',
  mutating: true,
  input: {
    full_name: z.string().optional().describe('Имя и фамилия. Пример: «Анна Смирнова»'),
    group: z.string().optional().describe('Учебная группа, пустая строка — убрать. Пример: «ИВТ-21»'),
    email: z.string().optional().describe('Новая почта. Пример: «anna@mail.ru»'),
    telegram: z.string().optional().describe('Ник в Telegram, можно с @; пустая строка — убрать. Пример: «@anna_smirnova»'),
  },
  run: async (args, ctx) => {
    const user = await currentUser(ctx);
    const input = {
      fullName: args.full_name ?? user.fullName,
      groupName: args.group ?? user.groupName ?? '',
      email: args.email ?? user.email,
      telegram: args.telegram ?? user.telegram ?? '',
    };
    const res = await updateProfile(user.id, input);
    if (!res.ok) throw new UserError(res.errors.map(profileErrorText).join(' '));
    const emailNote =
      input.email.trim().toLowerCase() !== user.email.toLowerCase()
        ? ` Почта изменилась — укажите ${input.email.trim()} в LIBRARY_USER_EMAIL и перезапустите Claude Desktop.`
        : '';
    return `Профиль сохранён: ${input.fullName.trim()}, ${input.groupName.trim() || 'без группы'}, ${input.email.trim()}.${emailNote}`;
  },
});

// ───────── Действия модератора ─────────

const bookFields = {
  title: z.string().describe('Название. Пример: «Грокаем алгоритмы»'),
  authors: z.string().describe('Авторы через запятую. Пример: «Т. Кормен, Ч. Лейзерсон, Р. Ривест»'),
  isbn: z.string().optional().describe('ISBN, можно с дефисами. Пример: «978-5-4461-0923-4»'),
  year: z.number().int('Год — целое число, например 2022.').optional().describe('Год издания. Пример: 2022'),
  copies: z.number().describe('Сколько экземпляров, целое число от 1. Пример: 4'),
};

async function duplicateWarning(isbn: string, exceptId?: number): Promise<string> {
  if (!isbn.trim()) return '';
  const dup = await findBookByIsbn(isbn, exceptId);
  return dup ? `\nВнимание: ${duplicateIsbnText(dup)}` : '';
}

const addBookTool = tool({
  name: 'add_book',
  description:
    'Добавить книгу в каталог — форма «Новая книга». Обязательны название, автор и количество ' +
    'экземпляров. Если книга с таким ISBN уже есть, добавит и предупредит, как форма. ' +
    'Только для модератора. Пример: «Добавь „Чистый код“ Роберта Мартина, 3 экземпляра».',
  role: 'moderator',
  mutating: true,
  input: bookFields,
  run: async (args) => {
    const input: BookInput = {
      title: args.title,
      authorsFull: args.authors,
      isbn: args.isbn ?? '',
      year: args.year ? String(args.year) : '',
      copiesTotal: args.copies,
      coverUri: null,
    };
    const warning = await duplicateWarning(input.isbn);
    const res = await addBook(input);
    if (!res.ok) throw new UserError(res.errors.map(bookInputErrorText).join(' '));
    return `Книга добавлена в каталог: «${input.title.trim()}», ${input.copiesTotal} экз. Номер в каталоге: ${res.id}.${warning}`;
  },
});

const updateBookTool = tool({
  name: 'update_book',
  description:
    'Изменить книгу — форма «Правка книги». Передавайте только поля, которые меняются. ' +
    'Опасное действие: без confirm: true только показывает, что изменится. ' +
    'Только для модератора. Пример: «Поставь книге 3 пять экземпляров».',
  role: 'moderator',
  mutating: true,
  input: {
    book_id: bookId,
    title: bookFields.title.optional(),
    authors: bookFields.authors.optional(),
    isbn: bookFields.isbn,
    year: bookFields.year,
    copies: bookFields.copies.optional(),
    confirm,
  },
  run: async (args) => {
    const book = await bookOrFail(args.book_id);
    const input: BookInput = {
      title: args.title ?? book.title,
      authorsFull: args.authors ?? book.authorsFull,
      isbn: args.isbn ?? book.isbn ?? '',
      year: args.year !== undefined ? String(args.year) : book.year ? String(book.year) : '',
      copiesTotal: args.copies ?? book.copiesTotal,
      coverUri: book.coverUri,
    };
    const changes = [
      input.title !== book.title && `название: «${book.title}» → «${input.title}»`,
      input.authorsFull !== book.authorsFull && `авторы: ${book.authorsFull} → ${input.authorsFull}`,
      input.isbn !== (book.isbn ?? '') && `ISBN: ${book.isbn ?? '—'} → ${input.isbn || '—'}`,
      input.year !== (book.year ? String(book.year) : '') && `год: ${book.year ?? '—'} → ${input.year || '—'}`,
      input.copiesTotal !== book.copiesTotal && `экземпляров: ${book.copiesTotal} → ${input.copiesTotal}`,
    ].filter(Boolean);
    if (!changes.length) return `В книге «${book.title}» ничего не меняется.`;
    const warning = await duplicateWarning(input.isbn, book.id);
    if (!args.confirm) return `Изменить «${book.title}»: ${changes.join('; ')}.${warning}\n${CONFIRM_HINT}`;
    const res = await updateBook(book.id, input);
    if (!res.ok) throw new UserError(res.errors.map(bookInputErrorText).join(' '));
    return `Изменения сохранены: ${changes.join('; ')}.${warning}`;
  },
});

const removeBookTool = tool({
  name: 'remove_book',
  description:
    'Убрать книгу из каталога — кнопка «Убрать из каталога» в правке книги. Нельзя, пока на книгу есть ' +
    'активные брони или выдачи. Опасное действие: без confirm: true только описывает, что произойдёт. ' +
    'Только для модератора. Пример: «Убери из каталога книгу 12».',
  role: 'moderator',
  mutating: true,
  input: { book_id: bookId, confirm },
  run: async ({ book_id, confirm: ok }) => {
    const book = await bookOrFail(book_id);
    const usage = await getActiveUsage(book_id);
    if (usage.reserved + usage.issued > 0) throw new UserError(removeBlockedText(usage));
    if (!ok) return `Убрать «${book.title}» из каталога? Книга пропадёт из поиска, история её броней удалится.\n${CONFIRM_HINT}`;
    const res = await removeBook(book_id);
    if (!res.ok) throw new UserError(removeBlockedText(await getActiveUsage(book_id)));
    return `«${book.title}» убрана из каталога.`;
  },
});

const issueBookTool = tool({
  name: 'issue_book',
  description:
    'Выдать книгу по брони — экран «Выдача». Ищет по коду брони или имени студента, как поле ' +
    '«Код брони или имя студента». Если у студента несколько броней, выдаёт все или только указанные в codes. ' +
    'Истёкшую бронь выдаёт без брони, если книга есть на полке. Срок возврата по умолчанию — по правилам ' +
    'библиотеки. Опасное действие: без confirm: true только показывает, что будет выдано. ' +
    'Только для модератора. Пример: «Выдай книгу по коду 7KQ4MX».',
  role: 'moderator',
  mutating: true,
  input: {
    query: z
      .string({ error: 'Укажите код брони или имя студента.' })
      .trim()
      .min(1, 'Укажите код брони или имя студента.')
      .describe('Код брони или имя студента. Пример: «7KQ4MX» или «Смирнова»'),
    codes: z.array(z.string()).optional().describe('Какие брони студента выдать, если их несколько. Пример: ["7KQ4MX"]'),
    due_date: z
      .string()
      .optional()
      .describe('Вернуть до, в формате ГГГГ-ММ-ДД. Не раньше сегодняшнего дня. Пример: «2026-10-28»'),
    confirm,
  },
  run: async (args, _ctx, user) => {
    const lookup = await lookupForIssue(args.query);
    if (lookup.kind === 'notFound') throw new UserError(issueNotFoundText(lookup.query));
    let dueAt = await defaultDueDate();
    if (args.due_date) {
      dueAt = parseDate(args.due_date);
      if (dueAt < startOfDay(Date.now())) throw new UserError('Срок возврата не может быть раньше сегодняшнего дня.');
    }
    if (lookup.kind === 'expired') {
      const b = lookup.booking;
      const text = expiredBookingText(b, lookup.bookAvailable);
      if (!lookup.bookAvailable) throw new UserError(text);
      if (!args.confirm) return `${text}\nВыдать без брони: «${b.book.title}» → ${b.user.fullName}, вернуть до ${dayMonth(dueAt)}.\n${CONFIRM_HINT}`;
      await issueWithoutBooking(b.userId, b.bookId, dueAt, user!.id);
      return `Выдано: «${b.book.title}» → ${b.user.fullName}, вернуть до ${dayMonth(dueAt)}.`;
    }
    const wanted = args.codes?.map((c) => c.replace(/\s+/g, '').toUpperCase());
    const chosen = wanted ? lookup.bookings.filter((b) => wanted.includes(b.code)) : lookup.bookings;
    if (!chosen.length) {
      throw new UserError(`Среди броней ${lookup.bookings[0].user.fullName} нет указанных кодов. Есть: ${lookup.bookings.map((b) => b.code).join(', ')}.`);
    }
    const titles = chosen.map((b) => `«${b.book.title}»`).join(', ');
    const summary = `${titles} → ${chosen[0].user.fullName}, вернуть до ${dayMonth(dueAt)}`;
    if (!args.confirm) return `Будет выдано: ${summary}. Коды: ${chosen.map((b) => b.code).join(', ')}.\n${CONFIRM_HINT}`;
    await issueBookings(
      chosen.map((b) => b.id),
      dueAt,
      user!.id,
    );
    return `Выдано: ${summary}.`;
  },
});

const checkReturnTool = tool({
  name: 'check_return',
  description:
    'Сверка возврата: книга на полке — закрыть запись. Это кнопка «На полке — закрыть» в списке «Сверка» ' +
    'для записей «Ожидает сверки» и «Просрочено». Только для модератора. ' +
    'Пример: «Книга по брони 7KQ4MX на полке, закрой запись».',
  role: 'moderator',
  mutating: true,
  input: { code },
  run: async (args, ctx, user) => {
    const b = await bookingByCode(args.code, user!, ctx);
    if (b.status !== 'awaiting_check' && b.status !== 'overdue') throw statusRefusal(b, 'закрыть сверкой');
    await closeOnShelf(b.id, user!.id);
    return `Запись ${b.code} закрыта: «${b.book.title}» на полке, ${b.user.fullName}.`;
  },
});

const markMissingTool = tool({
  name: 'mark_missing',
  description:
    'Книги нет на полке — кнопка «Нет на полке» в списке «Сверка». Запись вернётся в «Просрочено», ' +
    'книга пропадёт из наличия, читателю придёт уведомление. Опасное действие: без confirm: true ' +
    'только описывает, что произойдёт. Только для модератора. Пример: «Книги по брони 7KQ4MX нет на полке».',
  role: 'moderator',
  mutating: true,
  input: {
    code,
    comment: z.string().optional().describe('Комментарий для журнала. Пример: «проверил стеллаж 3 и соседние полки»'),
    confirm,
  },
  run: async (args, ctx, user) => {
    const b = await bookingByCode(args.code, user!, ctx);
    if (b.status !== 'awaiting_check' && b.status !== 'overdue') throw statusRefusal(b, 'отметить как ненайденную');
    if (!args.confirm) {
      return (
        `«${b.book.title}» не нашлась на полке. Запись вернётся в статус «Просрочено», книга пропадёт из наличия, ` +
        `${declineName(b.user.fullName, 'dat')} придёт уведомление.\n${CONFIRM_HINT}`
      );
    }
    await markMissing(b.id, user!.id, args.comment ?? '');
    return `Расхождение отмечено: запись ${b.code} снова «Просрочено», ${declineName(b.user.fullName, 'dat')} отправлено уведомление.`;
  },
});

const importBooksTool = tool({
  name: 'import_books',
  description:
    'Импорт книг списком — мастер «Импорт из таблицы». Проверяет строки теми же правилами: нужны название, ' +
    'автор, корректный ISBN (если указан) и количество от 1; строки с ошибками пропускаются. ' +
    'Без confirm: true только показывает итог проверки. Только для модератора. ' +
    'Пример: «Добавь в каталог эти книги: …».',
  role: 'moderator',
  mutating: true,
  input: {
    rows: z
      .array(
        z.object({
          title: z.string().describe('Название. Пример: «Чистый код»'),
          author: z.string().describe('Автор. Пример: «Р. Мартин»'),
          isbn: z.string().optional().describe('ISBN. Пример: «978-5-4461-0960-9»'),
          copies: z.number().describe('Количество экземпляров. Пример: 2'),
        }),
      )
      .min(1, 'Передайте хотя бы одну книгу.')
      .describe('Строки таблицы. Пример: [{"title": "Чистый код", "author": "Р. Мартин", "copies": 2}]'),
    duplicates: z
      .enum(['skip', 'increase'])
      .optional()
      .describe('Что делать с книгами, которые уже есть: skip — пропустить, increase — увеличить количество (по умолчанию). Пример: "increase"'),
    confirm,
  },
  run: async (args) => {
    const rows: ImportRow[] = args.rows.map((r, i) => ({
      line: i + 1,
      title: r.title,
      author: r.author,
      isbn: r.isbn ?? '',
      copies: r.copies,
      coverUri: '',
    }));
    const mode = args.duplicates ?? 'increase';
    const summary = await checkImportRows(rows);
    const errors = summary.rows
      .filter((r) => r.check.kind === 'error')
      .map((r) => `• Строка ${r.line} «${r.title || '—'}»: ${r.check.kind === 'error' ? IMPORT_ERROR_LABEL[r.check.error] : ''}`);
    if (!args.confirm) {
      const existing = summary.existing ? `, уже в каталоге ${summary.existing} (${mode === 'increase' ? 'пополнят фонд' : 'будут пропущены'})` : '';
      return [
        `Проверено строк: ${summary.total}. Будет добавлено ${summary.toAdd}${existing}, с ошибками ${summary.errors}.`,
        ...errors,
        CONFIRM_HINT,
      ].join('\n');
    }
    const res = await commitImport(summary, mode);
    const added = `${res.added} ${plural(res.added, ['новая книга добавлена', 'новые книги добавлено', 'новых книг добавлено'])}`;
    const increased = res.increased > 0 ? `, ${res.increased} ${plural(res.increased, ['пополнила', 'пополнили', 'пополнили'])} фонд` : '';
    const skipped = res.skipped > 0 ? ` Пропущено ${res.skipped} ${plural(res.skipped, ['строка', 'строки', 'строк'])} с ошибками.` : '';
    return [`${added}${increased}.${skipped}`, ...errors].join('\n');
  },
});

export const TOOLS: AnyTool[] = [
  searchBooksTool,
  getBookTool,
  listMyBookingsTool,
  getBookingByCodeTool,
  listJournalTool,
  listReconciliationTool,
  registerTool,
  createBookingTool,
  cancelBookingTool,
  joinQueueTool,
  leaveQueueTool,
  returnBookTool,
  updateProfileTool,
  addBookTool,
  updateBookTool,
  removeBookTool,
  issueBookTool,
  checkReturnTool,
  markMissingTool,
  importBooksTool,
];
