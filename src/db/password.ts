import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function makeSalt(): string {
  return toHex(getRandomBytes(16));
}

export function hashPassword(password: string, salt: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, salt + ':' + password);
}

/** Код брони: 6 символов без похожих друг на друга O/0 и I. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';

export function makeBookingCode(): string {
  return Array.from(getRandomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}
