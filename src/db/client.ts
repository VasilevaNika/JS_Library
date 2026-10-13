import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { seedDatabase } from '@/mocks/seed';

import { MIGRATIONS } from './schema';

const DB_NAME = 'campus-library.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

/** Единственная точка доступа к SQLite. Экраны её не вызывают — только модули src/db. */
export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = init().catch((e: unknown) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

async function init(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM users');
  if (!row || row.n === 0) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await seedDatabase(txn);
    });
  }
  return db;
}

async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(MIGRATIONS[v]);
      await txn.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

/** Полный сброс базы к тестовым данным (для dev-переключателей). */
export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.closeAsync();
  dbPromise = null;
  await deleteDatabaseAsync(DB_NAME);
}
