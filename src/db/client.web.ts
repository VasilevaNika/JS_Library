// Web-вариант клиента базы — только для превью в браузере.
// Нативный web-движок expo-sqlite требует SharedArrayBuffer (изолированную страницу), которой во
// встроенных браузерах нет. Здесь та же схема и те же тестовые данные, но на sql.js в памяти:
// данные живут до перезагрузки страницы. На iOS/Android (Expo Go) используется client.ts.
import { Asset } from 'expo-asset';
import type { SQLiteDatabase } from 'expo-sqlite';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

import { seedDatabase } from '@/mocks/seed';

import { MIGRATIONS } from './schema';

type Param = string | number | null;

function flat(params: unknown[]): SqlValue[] {
  // expo-sqlite принимает параметры и списком, и массивом — поддерживаем оба вида.
  return (params.length === 1 && Array.isArray(params[0]) ? params[0] : params) as Param[];
}

class WebDatabase {
  constructor(private readonly db: Database) {}

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: unknown[]) {
    this.db.run(sql, flat(params));
    const id = this.db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0];
    return { lastInsertRowId: Number(id ?? 0), changes: this.db.getRowsModified() };
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    stmt.bind(flat(params));
    const rows: T[] = [];
    // Строки приходят как объекты колонка → значение; тип T задаёт вызывающий код, как и в expo-sqlite.
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    stmt.free();
    return rows;
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, ...params);
    return rows[0] ?? null;
  }

  async withExclusiveTransactionAsync(task: (txn: WebDatabase) => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await task(this);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
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
  // wasm подключается как ассет Metro — для этого нужен require, import не поддерживает файлы .wasm.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const wasm = Asset.fromModule(require('sql.js/dist/sql-wasm.wasm'));
  await wasm.downloadAsync();
  const SQL = await initSqlJs({ locateFile: () => wasm.localUri ?? wasm.uri });
  // WebDatabase реализует ту часть API SQLiteDatabase, которой пользуется src/db; полного класса на web нет.
  const db = new WebDatabase(new SQL.Database()) as unknown as SQLiteDatabase;
  await db.execAsync('PRAGMA foreign_keys = ON;');
  for (const sql of MIGRATIONS) await db.execAsync(sql);
  await db.withExclusiveTransactionAsync(async (txn) => {
    await seedDatabase(txn);
  });
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

export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.closeAsync();
  dbPromise = null;
}
