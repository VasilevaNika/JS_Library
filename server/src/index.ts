// Общий сервер «Библиотеки кампуса». Хранит базу в SQLite-файле и выполняет функции из src/db
// по запросу приложения и MCP-сервера (обработчик — app.ts). Так приложение в браузере и Claude
// работают с одними данными через одно и то же приложение, а не каждый со своей копией базы.
import { networkInterfaces } from 'node:os';

import { databasePath, getDb } from '@/db/client';

import { createAppServer } from './app';

const PORT = Number(process.env.PORT ?? 4000);

function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => a!.address);
}

getDb()
  .then(() => {
    createAppServer().listen(PORT, () => {
      console.log(`База: ${databasePath()}`);
      console.log(`Сервер запущен: http://localhost:${PORT}`);
      for (const ip of lanAddresses()) console.log(`  для телефона в той же сети: http://${ip}:${PORT}`);
      console.log('В приложении задайте EXPO_PUBLIC_API_URL одним из этих адресов (файл .env.local),');
      console.log(`в настройках MCP-сервера — LIBRARY_API_URL=http://localhost:${PORT}.`);
    });
  })
  .catch((e: unknown) => {
    console.error('Не удалось открыть базу:', e);
    process.exit(1);
  });
