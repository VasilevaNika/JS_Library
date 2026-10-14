// Node-вариант клиента базы — для общего сервера (server/) и MCP-сервера (mcp-server/).
// Та же схема, миграции и тестовые данные, что в приложении, но база — обычный файл на диске,
// поэтому её одновременно видят оба сервера. Путь задаёт LIBRARY_DB_PATH.
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { SQLiteDatabase } from 'expo-sqlite';

import { seedDatabase } from '@/mocks/seed';

import { MIGRATIONS } from './schema';

const DEFAULT_PATH = resolve(__dirname, '..', '..', 'server', 'data', 'library.db');

export function databasePath(): string {
  return resolve(process.env.LIBRARY_DB_PATH ?? DEFAULT_PATH);
}

function flat(params: unknown[]): SQLInputValue[] {
  // expo-sqlite принимает параметры и списком, и массивом — поддерживаем оба вида.
  return (params.length === 1 && Array.isArray(params[0]) ? params[0] : params) as SQLInputValue[];
}

class NodeDatabase {
  private inTransaction = false;

  constructor(private readonly db: DatabaseSync) {}

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: unknown[]) {
    const r = this.db.prepare(sql).run(...flat(params));
    return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    // Строки приходят как объекты колонка → значение; тип T задаёт вызывающий код, как и в expo-sqlite.
    return this.db.prepare(sql).all(...flat(params)) as T[];
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.prepare(sql).get(...flat(params)) as T | undefined) ?? null;
  }

  async withExclusiveTransactionAsync(task: (txn: NodeDatabase) => Promise<void>): Promise<void> {
    // Вложенная транзакция (например, сид внутри миграции) просто выполняется в текущей.
    if (this.inTransaction) return task(this);
    this.db.exec('BEGIN IMMEDIATE');
    this.inTransaction = true;
    try {
      await task(this);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    } finally {
      this.inTransaction = false;
    }
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await this.withExclusiveTransactionAsync(task);
  }

  async closeAsync(): Promise<void> {
    this.db.close();
  }
}

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function init(): Promise<SQLiteDatabase> {
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });
  const raw = new DatabaseSync(path);
  // NodeDatabase реализует ту часть API SQLiteDatabase, которой пользуется src/db; полного класса в Node нет.
  const db = new NodeDatabase(raw) as unknown as SQLiteDatabase;
  // Два процесса (сервер приложения и MCP-сервер) пишут в один файл: WAL и ожидание блокировки.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(MIGRATIONS[v]);
      await txn.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
  const users = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM users');
  if (!users || users.n === 0) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await seedDatabase(txn);
    });
  }
  return db;
}

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = init().catch((e: unknown) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

/** Полный сброс базы к тестовым данным: файл удаляется и при следующем обращении создаётся заново. */
export async function resetDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
  const path = databasePath();
  for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
}
