// Node-вариант password.ts для общего сервера и MCP-сервера: тот же SHA-256 с солью, что и expo-crypto.
import { createHash, randomBytes } from 'node:crypto';

export function makeSalt(): string {
  return randomBytes(16).toString('hex');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return createHash('sha256').update(salt + ':' + password).digest('hex');
}

/** Код брони: 6 символов без похожих друг на друга O/0 и I. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';

export function makeBookingCode(): string {
  return Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}
