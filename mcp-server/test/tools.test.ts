// Юнит-тесты инструментов: для каждого — успешный вызов и хотя бы одна ошибка
// (нет прав, лимит, неверные данные, нет подтверждения). База — временный файл, перед каждым тестом
// она пересоздаётся из тестовых данных src/mocks/seed.ts.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  bookingLimitText,
  getBookingByCode,
  getBook,
  getSettings,
  getUserByEmail,
  listAudit,
  listCatalog,
  resetDatabase,
  TEXT,
} from '@/db/api';
import type { UserRole } from '@/db/api';

import { createServer } from '../src/server';
import { TOOLS } from '../src/tools';

const STUDENT = 'anna.smirnova@mail.ru';
const MODERATOR = 'moderator@campus.test';

type Call = (name: string, args?: Record<string, unknown>) => Promise<{ ok: boolean; text: string }>;

async function connect(email: string, role: UserRole | null): Promise<Call> {
  const server = createServer({ email, role });
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientSide);
  return async (name, args = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const content = res.content as { type: string; text: string }[];
    return { ok: !res.isError, text: content.map((c) => c.text).join('\n') };
  };
}

let student: Call;
let moderator: Call;

beforeAll(() => {
  process.env.LIBRARY_DB_PATH = join(mkdtempSync(join(tmpdir(), 'library-mcp-')), 'test.db');
});

beforeEach(async () => {
  await resetDatabase();
  student = await connect(STUDENT, 'student');
  moderator = await connect(MODERATOR, 'moderator');
});

/** Книги в наличии, которых у студента нет. */
async function freeBooks(): Promise<number[]> {
  const all = await listCatalog();
  return all.filter((b) => b.publicStatus === 'available' && ![1, 3, 6, 7].includes(b.id)).map((b) => b.id);
}

describe('список инструментов', () => {
  it('у каждого инструмента и каждого параметра есть описание на русском с примером', async () => {
    const server = createServer({ email: STUDENT, role: 'student' });
    const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(clientSide);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(TOOLS.map((t) => t.name).sort());
    for (const t of tools) {
      expect(t.description, t.name).toMatch(/Пример/);
      const props = (t.inputSchema.properties ?? {}) as Record<string, { description?: string }>;
      for (const [param, schema] of Object.entries(props)) {
        expect(schema.description, `${t.name}.${param}`).toMatch(/Пример/);
      }
    }
  });
});

describe('search_books', () => {
  it('находит книгу', async () => {
    const r = await student('search_books', { query: 'грокаем' });
    expect(r.ok).toBe(true);
    expect(r.text).toContain('«Грокаем алгоритмы»');
  });
  it('пустой запрос — ошибка с понятным текстом', async () => {
    const r = await student('search_books', { query: '  ' });
    expect(r.ok).toBe(false);
    expect(r.text).toContain('Укажите, что искать');
  });
});

describe('get_book', () => {
  it('показывает карточку и что можно сделать', async () => {
    const r = await student('get_book', { book_id: 3 });
    expect(r.ok).toBe(true);
    expect(r.text).toContain('Грокаем алгоритмы');
    expect(r.text).toContain('Срок возврата прошёл');
  });
  it('несуществующая книга', async () => {
    const r = await student('get_book', { book_id: 9999 });
    expect(r).toEqual({ ok: false, text: 'Книга не найдена. Возможно, её убрали из каталога.' });
  });
});

describe('list_my_bookings', () => {
  it('показывает брони студента с кодами', async () => {
    const r = await student('list_my_bookings');
    expect(r.ok).toBe(true);
    expect(r.text).toContain('7KQ4MX');
    expect(r.text).toContain('Просрочено');
  });
  it('у модератора нет своих броней', async () => {
    const r = await moderator('list_my_bookings');
    expect(r.ok).toBe(false);
    expect(r.text).toContain('только читателю');
  });
});

describe('get_booking_by_code', () => {
  it('своя бронь, регистр и пробелы не важны', async () => {
    const r = await student('get_booking_by_code', { code: '7kq 4mx' });
    expect(r.ok).toBe(true);
    expect(r.text).toContain('Забронирована');
  });
  it('чужую бронь студент не видит, модератор видит', async () => {
    expect((await student('get_booking_by_code', { code: '6TF2HM' })).text).toBe(
      'Бронь с кодом 6TF2HM не найдена среди ваших броней.',
    );
    const r = await moderator('get_booking_by_code', { code: '6TF2HM' });
    expect(r.ok).toBe(true);
    expect(r.text).toContain('Читатель:');
  });
});

describe('list_journal', () => {
  it('модератор фильтрует просрочки', async () => {
    const r = await moderator('list_journal', { filters: ['overdue'] });
    expect(r.ok).toBe(true);
    expect(r.text).toContain('6TF2HM');
    expect(r.text).not.toContain('7KQ4MX');
  });
  it('студенту недоступен', async () => {
    const r = await student('list_journal');
    expect(r.ok).toBe(false);
    expect(r.text).toBe(
      'Это действие доступно только модератору библиотеки. Сейчас вы работаете как студент (anna.smirnova@mail.ru).',
    );
  });
  it('LIBRARY_ROLE=moderator не даёт прав студенту из базы', async () => {
    const fake = await connect(STUDENT, 'moderator');
    expect((await fake('list_journal')).ok).toBe(false);
  });
  it('неизвестный фильтр отклоняется схемой', async () => {
    expect((await moderator('list_journal', { filters: ['lost'] })).ok).toBe(false);
  });
});

describe('list_reconciliation', () => {
  it('модератор видит записи на сверку', async () => {
    const r = await moderator('list_reconciliation');
    expect(r.ok).toBe(true);
    expect(r.text).toContain('5MV8KD');
  });
  it('студенту недоступен', async () => {
    expect((await student('list_reconciliation')).ok).toBe(false);
  });
});

describe('register', () => {
  it('регистрирует читателя, пароль в журнал не попадает', async () => {
    const r = await student('register', { full_name: 'Пётр Иванов', email: 'petr@mail.ru', password: 'library2026' });
    expect(r.ok).toBe(true);
    expect(await getUserByEmail('petr@mail.ru')).not.toBeNull();
    const [entry] = await listAudit(1);
    expect(entry.tool).toBe('register');
    expect(entry.params).not.toContain('library2026');
  });
  it('те же проверки, что в форме', async () => {
    const r = await student('register', { full_name: 'Пётр', email: 'petr.mail.ru', password: '123' });
    expect(r).toEqual({ ok: false, text: `${TEXT.emailInvalid} ${TEXT.passwordShort}` });
    const taken = await student('register', { full_name: 'Анна', email: STUDENT, password: 'library2026' });
    expect(taken.text).toBe(TEXT.emailTaken);
  });
});

describe('create_booking', () => {
  it('оформляет бронь', async () => {
    const [bookId] = await freeBooks();
    const r = await student('create_booking', { book_id: bookId });
    expect(r.ok).toBe(true);
    expect(r.text).toMatch(/Код брони: [A-Z0-9]{6}/);
  });
  it('лимит броней — текст как в приложении', async () => {
    const settings = await getSettings();
    const free = await freeBooks();
    // У студента уже одна бронь (7KQ4MX), добираем до лимита.
    for (const id of free.slice(0, settings.maxActiveBookings - 1)) {
      expect((await student('create_booking', { book_id: id })).ok).toBe(true);
    }
    const r = await student('create_booking', { book_id: free[settings.maxActiveBookings - 1] });
    expect(r).toEqual({ ok: false, text: bookingLimitText(settings.maxActiveBookings) });
  });
  it('уже моя книга и неверный номер', async () => {
    expect((await student('create_booking', { book_id: 1 })).text).toBe(TEXT.bookingAlreadyMine);
    expect((await student('create_booking', { book_id: -1 })).ok).toBe(false);
  });
});

describe('cancel_booking', () => {
  it('без confirm ничего не меняет', async () => {
    const r = await student('cancel_booking', { code: '7KQ4MX' });
    expect(r.ok).toBe(true);
    expect(r.text).toContain('Ничего не изменено');
    expect((await getBookingByCode('7KQ4MX'))?.status).toBe('reserved');
  });
  it('с confirm отменяет', async () => {
    const r = await student('cancel_booking', { code: '7KQ4MX', confirm: true });
    expect(r.ok).toBe(true);
    expect((await getBookingByCode('7KQ4MX'))?.status).toBe('cancelled');
  });
  it('выданную книгу отменить нельзя', async () => {
    const r = await student('cancel_booking', { code: '9RT2WE', confirm: true });
    expect(r.ok).toBe(false);
    expect(r.text).toContain('нельзя отменить');
  });
});

describe('join_queue и leave_queue', () => {
  it('новый читатель встаёт в очередь за занятой книгой и выходит из неё', async () => {
    await student('register', { full_name: 'Пётр Иванов', email: 'petr@mail.ru', password: 'library2026' });
    const petr = await connect('petr@mail.ru', 'student');
    const join = await petr('join_queue', { book_id: 2 });
    expect(join.ok).toBe(true);
    expect(join.text).toMatch(/^Вы \d+-й в очереди за «Алгоритмы на C\+\+»/);
    const leave = await petr('leave_queue', { book_id: 2 });
    expect(leave.ok).toBe(true);
  });
  it('за книгой в наличии очередь не нужна', async () => {
    const [bookId] = await freeBooks();
    const r = await student('join_queue', { book_id: bookId });
    expect(r.ok).toBe(false);
    expect(r.text).toContain('очередь не нужна');
  });
  it('выйти из очереди, в которой не стоишь, нельзя', async () => {
    const [bookId] = await freeBooks();
    const r = await student('leave_queue', { book_id: bookId });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/^Вас нет в очереди/);
  });
});

describe('return_book', () => {
  it('без confirm — только вопрос, с confirm — отметка возврата', async () => {
    const preview = await student('return_book', { code: '9RT2WE' });
    expect(preview.text).toContain('на полку?');
    expect((await getBookingByCode('9RT2WE'))?.status).toBe('issued');
    const r = await student('return_book', { code: '9RT2WE', confirm: true });
    expect(r.ok).toBe(true);
    expect((await getBookingByCode('9RT2WE'))?.status).toBe('awaiting_check');
  });
  it('книгу по брони, которая ещё не выдана, вернуть нельзя', async () => {
    const r = await student('return_book', { code: '7KQ4MX', confirm: true });
    expect(r.ok).toBe(false);
  });
});

describe('update_profile', () => {
  it('меняет только переданные поля', async () => {
    const r = await student('update_profile', { group: 'ИВТ-21' });
    expect(r.ok).toBe(true);
    const user = await getUserByEmail(STUDENT);
    expect(user?.groupName).toBe('ИВТ-21');
    expect(user?.fullName).toBe('Анна Смирнова');
  });
  it('почта без @ и занятая почта', async () => {
    expect((await student('update_profile', { email: 'anna.mail.ru' })).text).toBe(TEXT.emailInvalid);
    expect((await student('update_profile', { email: MODERATOR })).text).toBe(TEXT.emailTaken);
  });
});

describe('add_book', () => {
  it('добавляет книгу', async () => {
    const r = await moderator('add_book', { title: 'Чистый код', authors: 'Р. Мартин', copies: 3, year: 2019 });
    expect(r.ok).toBe(true);
    expect(r.text).toContain('«Чистый код», 3 экз.');
  });
  it('пустые поля и неверное количество — тексты формы', async () => {
    const r = await moderator('add_book', { title: ' ', authors: '', copies: 0 });
    expect(r).toEqual({ ok: false, text: `${TEXT.titleRequired} ${TEXT.authorRequired} ${TEXT.copiesInvalid}` });
  });
  it('предупреждает о дубликате ISBN', async () => {
    const r = await moderator('add_book', { title: 'Грокаем 2', authors: 'А. Бхаргава', isbn: '9785446109234', copies: 1 });
    expect(r.text).toContain('Книга с этим ISBN уже есть в каталоге');
  });
  it('студенту недоступен', async () => {
    expect((await student('add_book', { title: 'X', authors: 'Y', copies: 1 })).ok).toBe(false);
  });
});

describe('update_book', () => {
  it('без confirm показывает изменения и ничего не меняет', async () => {
    const r = await moderator('update_book', { book_id: 3, copies: 6 });
    expect(r.text).toContain('экземпляров: 4 → 6');
    expect((await getBook(3))?.copiesTotal).toBe(4);
  });
  it('с confirm сохраняет', async () => {
    expect((await moderator('update_book', { book_id: 3, copies: 6, confirm: true })).ok).toBe(true);
    expect((await getBook(3))?.copiesTotal).toBe(6);
  });
  it('неверное количество', async () => {
    const r = await moderator('update_book', { book_id: 3, copies: 0, confirm: true });
    expect(r).toEqual({ ok: false, text: TEXT.copiesInvalid });
  });
});

describe('remove_book', () => {
  it('нельзя убрать книгу с активными бронями', async () => {
    const r = await moderator('remove_book', { book_id: 1, confirm: true });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/^Нельзя, пока на книгу есть активные брони/);
  });
  it('без confirm спрашивает, с confirm убирает', async () => {
    await moderator('add_book', { title: 'Временная', authors: 'А. Автор', copies: 1 });
    const book = (await listCatalog('Временная'))[0];
    expect((await moderator('remove_book', { book_id: book.id })).text).toContain('Ничего не изменено');
    expect(await getBook(book.id)).not.toBeNull();
    expect((await moderator('remove_book', { book_id: book.id, confirm: true })).ok).toBe(true);
    expect(await getBook(book.id)).toBeNull();
  });
});

describe('issue_book', () => {
  it('без confirm ничего не выдаёт, с confirm выдаёт', async () => {
    const preview = await moderator('issue_book', { query: '7KQ4MX' });
    expect(preview.text).toMatch(/^Будет выдано: «Алгоритмы. Построение и анализ» → Анна Смирнова/);
    expect((await getBookingByCode('7KQ4MX'))?.status).toBe('reserved');
    const r = await moderator('issue_book', { query: '7KQ4MX', confirm: true });
    expect(r.text).toMatch(/^Выдано:/);
    expect((await getBookingByCode('7KQ4MX'))?.status).toBe('issued');
  });
  it('код не найден и срок в прошлом', async () => {
    expect((await moderator('issue_book', { query: 'ZZZZZZ' })).text).toBe(
      'Бронь с кодом ZZZZZZ не найдена. Проверьте код или найдите по имени студента.',
    );
    const past = await moderator('issue_book', { query: '7KQ4MX', due_date: '2020-01-01', confirm: true });
    expect(past).toEqual({ ok: false, text: 'Срок возврата не может быть раньше сегодняшнего дня.' });
  });
  it('студенту недоступен', async () => {
    expect((await student('issue_book', { query: '7KQ4MX', confirm: true })).ok).toBe(false);
  });
});

describe('check_return', () => {
  it('закрывает запись «Ожидает сверки»', async () => {
    const r = await moderator('check_return', { code: '5MV8KD' });
    expect(r.ok).toBe(true);
    expect((await getBookingByCode('5MV8KD'))?.status).toBe('closed');
  });
  it('бронь, которая ещё не выдана, закрыть нельзя', async () => {
    expect((await moderator('check_return', { code: '7KQ4MX' })).ok).toBe(false);
  });
});

describe('mark_missing', () => {
  it('без confirm только описывает, с confirm возвращает в «Просрочено»', async () => {
    const preview = await moderator('mark_missing', { code: '5MV8KD' });
    expect(preview.text).toContain('Анне Смирновой придёт уведомление');
    expect((await getBookingByCode('5MV8KD'))?.status).toBe('awaiting_check');
    const r = await moderator('mark_missing', { code: '5MV8KD', comment: 'проверил стеллаж 3', confirm: true });
    expect(r.ok).toBe(true);
    expect((await getBookingByCode('5MV8KD'))?.status).toBe('overdue');
  });
  it('студенту недоступен', async () => {
    expect((await student('mark_missing', { code: '5MV8KD', confirm: true })).ok).toBe(false);
  });
});

describe('import_books', () => {
  const rows = [
    { title: 'Чистый код', author: 'Р. Мартин', copies: 2 },
    { title: 'Грокаем алгоритмы', author: 'А. Бхаргава', isbn: '978-5-4461-0923-4', copies: 1 },
    { title: 'Без автора', author: '', copies: 1 },
  ];
  it('без confirm показывает итог проверки и ничего не добавляет', async () => {
    const r = await moderator('import_books', { rows });
    expect(r.text).toContain('Будет добавлено 1, уже в каталоге 1');
    expect(r.text).toContain('Строка 3 «Без автора»: Нет автора');
    expect(await listCatalog('Чистый код')).toHaveLength(0);
  });
  it('с confirm добавляет и пополняет фонд', async () => {
    const r = await moderator('import_books', { rows, confirm: true });
    expect(r.text).toMatch(/^1 новая книга добавлена, 1 пополнила фонд\. Пропущено 1 строка/);
    expect(await listCatalog('Чистый код')).toHaveLength(1);
    expect((await getBook(3))?.copiesTotal).toBe(5);
  });
  it('пустой список отклоняется', async () => {
    expect((await moderator('import_books', { rows: [], confirm: true })).ok).toBe(false);
  });
});

describe('журнал mcp_audit', () => {
  it('пишет изменяющие действия, в том числе отказы, и не пишет чтение', async () => {
    await student('search_books', { query: 'грокаем' });
    await student('cancel_booking', { code: '9RT2WE', confirm: true });
    await student('cancel_booking', { code: '7KQ4MX', confirm: true });
    const log = await listAudit(10);
    expect(log.map((e) => e.tool)).toEqual(['cancel_booking', 'cancel_booking']);
    expect(log[0]).toMatchObject({ userEmail: STUDENT, ok: true, params: '{"code":"7KQ4MX","confirm":true}' });
    expect(log[1].ok).toBe(false);
  });
});

describe('пользователь', () => {
  it('неизвестная почта — понятная ошибка', async () => {
    const ghost = await connect('nobody@mail.ru', 'student');
    const r = await ghost('list_my_bookings');
    expect(r.text).toMatch(/^Пользователь nobody@mail.ru не найден/);
  });
});
