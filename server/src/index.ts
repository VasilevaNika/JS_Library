// Общий сервер «Библиотеки кампуса». Хранит базу в SQLite-файле и выполняет функции из src/db
// по запросу приложения: POST /rpc/<имя> с телом {"args": [...]} → {"ok": true, "result": ...}.
// MCP-сервер работает с тем же файлом напрямую, поэтому приложение и Claude видят одни данные.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';

import * as api from '@/db/api';
import { databasePath, getDb } from '@/db/client';
import { REMOTE_FUNCTIONS, type RemoteFunction } from '@/db/remoteNames';

const PORT = Number(process.env.PORT ?? 4000);
const ALLOWED = new Set<string>(REMOTE_FUNCTIONS);

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    // Приложение в веб-превью открыто с другого адреса — разрешаем запросы с любого.
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

async function call(name: string, args: unknown[]): Promise<unknown> {
  if (name === '__reset') {
    await api.resetDatabase();
    await getDb();
    return null;
  }
  // Имя проверено по списку REMOTE_FUNCTIONS; аргументы приходят из приложения в том же виде,
  // в каком экраны передают их локальной функции.
  const fn = api[name as RemoteFunction] as (...a: unknown[]) => unknown;
  return fn(...args);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, null);
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });
    const match = /^\/rpc\/(\w+)$/.exec(url.pathname);
    if (req.method !== 'POST' || !match) return send(res, 404, { ok: false, error: 'Нет такого адреса' });
    const name = match[1];
    if (!ALLOWED.has(name) && name !== '__reset') {
      return send(res, 404, { ok: false, error: `Нет такой функции: ${name}` });
    }
    const body = (await readJson(req)) as { args?: unknown };
    const args = Array.isArray(body.args) ? body.args : [];
    const result = await call(name, args);
    send(res, 200, { ok: true, result: result ?? null });
  } catch (e) {
    console.error(e);
    send(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => a!.address);
}

getDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`База: ${databasePath()}`);
      console.log(`Сервер запущен: http://localhost:${PORT}`);
      for (const ip of lanAddresses()) console.log(`  для телефона в той же сети: http://${ip}:${PORT}`);
      console.log('В приложении задайте EXPO_PUBLIC_API_URL одним из этих адресов (файл .env.local).');
    });
  })
  .catch((e: unknown) => {
    console.error('Не удалось открыть базу:', e);
    process.exit(1);
  });
