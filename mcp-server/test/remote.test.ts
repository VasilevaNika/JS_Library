// MCP-сервер через сервер приложения: тест поднимает server/ (тот, что обслуживает приложение в браузере),
// задаёт LIBRARY_API_URL и проверяет, что инструменты меняют данные через HTTP, а не через файл напрямую.
// Модули подключаются через import() внутри beforeAll: адрес сервера должен быть известен до загрузки src/db/remote.
import { mkdtempSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type Call = (name: string, args?: Record<string, unknown>) => Promise<{ ok: boolean; text: string }>;

let http: Server;
let student: Call;
let db: typeof import('@/db/api');
const requests: string[] = [];

beforeAll(async () => {
  process.env.LIBRARY_DB_PATH = join(mkdtempSync(join(tmpdir(), 'library-remote-')), 'test.db');
  const { createAppServer } = await import('../../server/src/app');
  http = createAppServer();
  http.on('request', (req) => requests.push(req.url ?? ''));
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  process.env.LIBRARY_API_URL = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;

  db = await import('@/db/api');
  const { createServer } = await import('../src/server');
  const server = createServer({ email: 'anna.smirnova@mail.ru', role: 'student' });
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientSide);
  student = async (name, args = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const content = res.content as { type: string; text: string }[];
    return { ok: !res.isError, text: content.map((c) => c.text).join('\n') };
  };
});

afterAll(() => {
  http?.close();
});

describe('MCP через сервер приложения', () => {
  it('бронь оформляется запросами к серверу и видна в его базе', async () => {
    const free = (await db.listCatalog()).find((b) => b.publicStatus === 'available' && ![1, 3, 6, 7].includes(b.id));
    const version = () =>
      fetch(`${process.env.LIBRARY_API_URL}/version`).then((x) => x.json() as Promise<{ result: number }>).then((b) => b.result);
    const before = await version();
    const r = await student('create_booking', { book_id: free!.id });
    // Сервер отметил изменение — открытые приложения обновят экран.
    expect(await version()).toBe(before + 1);
    expect(r.ok).toBe(true);
    // Пользователь, бронь и журнал — всё через HTTP.
    expect(requests).toEqual(expect.arrayContaining(['/rpc/getUserByEmail', '/rpc/createBooking', '/rpc/logAudit']));
    const code = /Код брони: ([A-Z0-9]{6})/.exec(r.text)![1];
    expect((await db.getBookingByCode(code))?.status).toBe('reserved');
    const [entry] = await db.listAudit(1);
    expect(entry).toMatchObject({ tool: 'create_booking', ok: true });
  });

  it('ошибки приложения приходят с сервера теми же словами', async () => {
    const r = await student('create_booking', { book_id: 1 });
    expect(r).toEqual({ ok: false, text: 'Эта книга уже забронирована или выдана вам.' });
  });

  it('если сервер приложения выключен — понятная ошибка', async () => {
    await new Promise<void>((resolve) => http.close(() => resolve()));
    const r = await student('search_books', { query: 'грокаем' });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/^Сервер библиотеки не отвечает/);
  });
});
