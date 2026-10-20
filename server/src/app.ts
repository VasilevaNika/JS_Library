// HTTP-обработчик общего сервера: POST /rpc/<имя> с телом {"args": [...]} → {"ok": true, "result": ...}.
// GET /events — поток событий (Server-Sent Events): после каждого изменения данных открытые приложения
// получают сообщение и перезагружают экран. Так действие Claude сразу видно во вкладке браузера.
// Сервер вызывают приложение (в браузере или на телефоне) и MCP-сервер — все работают с одной базой
// через одни и те же функции src/db. Вынесен из index.ts, чтобы тесты могли поднять сервер сами.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import * as api from '@/db/api';
import { getDb } from '@/db/client';
import { MUTATING_FUNCTIONS, REMOTE_FUNCTIONS, type RemoteFunction } from '@/db/remoteNames';

const ALLOWED = new Set<string>(REMOTE_FUNCTIONS);

const CORS = {
  // Приложение в браузере открыто с другого адреса (порт Expo) — разрешаем запросы с любого.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS });
  res.end(JSON.stringify(body));
}

/** Номер версии данных: растёт после каждого изменения. Приложения без EventSource опрашивают его. */
let version = 0;
const listeners = new Set<ServerResponse>();

function subscribe(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', ...CORS });
  res.write(`retry: 2000\ndata: {"version":${version}}\n\n`);
  listeners.add(res);
  // Пустой комментарий раз в 25 секунд — чтобы соединение не закрылось по простою.
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(ping);
    listeners.delete(res);
  });
}

function notifyChanged(fn: string): void {
  version++;
  for (const res of listeners) res.write(`data: {"version":${version},"fn":"${fn}"}\n\n`);
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
  // Имя проверено по списку REMOTE_FUNCTIONS; аргументы приходят в том же виде,
  // в каком экраны и MCP-сервер передают их локальной функции.
  const fn = api[name as RemoteFunction] as (...a: unknown[]) => unknown;
  return fn(...args);
}

export function createAppServer(): Server {
  return createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return send(res, 204, null);
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });
      if (req.method === 'GET' && url.pathname === '/events') return subscribe(req, res);
      if (req.method === 'GET' && url.pathname === '/version') return send(res, 200, { ok: true, result: version });
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
      if (name === '__reset' || MUTATING_FUNCTIONS.has(name as RemoteFunction)) notifyChanged(name);
    } catch (e) {
      console.error(e);
      send(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });
}
