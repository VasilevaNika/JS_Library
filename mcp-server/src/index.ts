// Точка входа: Claude Desktop запускает этот файл и общается с ним через stdin/stdout (stdio).
// stdout занят протоколом MCP, поэтому все сообщения для человека — только в stderr (console.error).
//
// Два режима работы с данными:
// - LIBRARY_API_URL задан — все действия идут через сервер приложения (server/), тот же, что обслуживает
//   приложение в браузере. Так Claude работает с приложением, и изменения сразу видны в открытой вкладке.
// - LIBRARY_API_URL не задан — функции из src/db работают с файлом базы напрямую (так устроены тесты).
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { databasePath, getDb } from '@/db/client';
import { API_URL } from '@/db/remote';

import { contextFromEnv } from './context';
import { createServer } from './server';

async function main(): Promise<void> {
  const ctx = contextFromEnv();
  if (API_URL) {
    // Сервер приложения может быть ещё не запущен — тогда инструменты ответят понятной ошибкой.
    const alive = await fetch(`${API_URL}/health`).then((r) => r.ok, () => false);
    console.error(`Данные — через сервер приложения ${API_URL}${alive ? '' : ' (сейчас не отвечает)'}.`);
  } else {
    await getDb();
    console.error(`Данные — напрямую из файла ${databasePath()}.`);
  }
  const server = createServer(ctx);
  await server.connect(new StdioServerTransport());
  console.error(`MCP-сервер библиотеки запущен. Пользователь: ${ctx.email || 'не задан'}.`);
}

main().catch((e: unknown) => {
  console.error('MCP-сервер не запустился:', e);
  process.exit(1);
});
