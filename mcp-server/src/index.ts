// Точка входа: Claude Desktop запускает этот файл и общается с ним через stdin/stdout (stdio).
// stdout занят протоколом MCP, поэтому все сообщения для человека — только в stderr (console.error).
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { databasePath, getDb } from '@/db/client';

import { contextFromEnv } from './context';
import { createServer } from './server';

async function main(): Promise<void> {
  const ctx = contextFromEnv();
  await getDb();
  const server = createServer(ctx);
  await server.connect(new StdioServerTransport());
  console.error(`MCP-сервер библиотеки запущен. База: ${databasePath()}. Пользователь: ${ctx.email || 'не задан'}.`);
}

main().catch((e: unknown) => {
  console.error('MCP-сервер не запустился:', e);
  process.exit(1);
});
