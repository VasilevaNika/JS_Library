// HTTP-обработчик общего сервера: POST /rpc/<имя> с телом {"args": [...]} → {"ok": true, "result": ...}.
// Его вызывают приложение (в браузере или на телефоне) и MCP-сервер — все работают с одной базой
// через одни и те же функции src/db. Вынесен из index.ts, чтобы тесты могли поднять сервер сами.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import * as api from '@/db/api';
import { getDb } from '@/db/client';
import { REMOTE_FUNCTIONS, type RemoteFunction } from '@/db/remoteNames';

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
}
