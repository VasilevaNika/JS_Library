import { getDb } from './client';
import { SETTINGS_KEYS } from './settingsKeys';
import type { LibrarySettings } from './types';

export { SETTINGS_KEYS };

const NUMERIC: (keyof LibrarySettings)[] = ['pickupHours', 'loanDays', 'maxActiveBookings', 'queueHoldHours'];

export async function getSettings(): Promise<LibrarySettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out: Record<string, string | number | null> = {};
  for (const [field, key] of Object.entries(SETTINGS_KEYS) as [keyof LibrarySettings, string][]) {
    const v = map.get(key) ?? null;
    out[field] = NUMERIC.includes(field) ? Number(v ?? 0) : v;
  }
  // Поля собраны по SETTINGS_KEYS — полный набор ключей LibrarySettings.
  return out as LibrarySettings;
}
