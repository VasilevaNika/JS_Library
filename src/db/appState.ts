// Состояние приложения: текущая сессия и dev-переключатели.
import { getDb } from './client';

const SESSION_USER = 'session_user_id';

/** Dev-переключатели для состояний, которые в локальном режиме не возникают сами (spec.md, Q7). */
export type DevFlag = 'offline' | 'race' | 'sessionExpired' | 'bookingError' | 'loadError';

async function getValue(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM app_state WHERE key = ?', key);
  return row?.value ?? null;
}

async function setValue(key: string, value: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function getSessionUserId(): Promise<number | null> {
  const v = await getValue(SESSION_USER);
  return v ? Number(v) : null;
}

export async function setSessionUserId(id: number | null): Promise<void> {
  await setValue(SESSION_USER, id === null ? null : String(id));
}

export async function getDevFlag(flag: DevFlag): Promise<boolean> {
  return (await getValue('dev_' + flag)) === '1';
}

export async function setDevFlag(flag: DevFlag, on: boolean): Promise<void> {
  await setValue('dev_' + flag, on ? '1' : '0');
}
