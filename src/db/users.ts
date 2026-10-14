import type { CoverColor } from '@/theme/tokens';

import { getSessionUserId, setSessionUserId } from './appState';
import { getDb } from './client';
import { toUser, type UserRow } from './mappers';
import { hashPassword, makeSalt } from './password';
import { now } from './time';
import type { User } from './types';

const USER_COLUMNS = `id, role, full_name, group_name, email, telegram, telegram_enabled,
  password_changed_at, ticket_number, avatar_uri, avatar_color`;

export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(email: string): boolean {
  return email.includes('@');
}

export async function getUser(id: number): Promise<User | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, id);
  return row ? toUser(row) : null;
}

export async function getCurrentUser(): Promise<User | null> {
  const id = await getSessionUserId();
  return id === null ? null : getUser(id);
}

export async function isEmailTaken(email: string, exceptUserId?: number): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM users WHERE email = ? AND id != ?',
    email.trim(),
    exceptUserId ?? -1,
  );
  return row !== null;
}

export type LoginResult = { ok: true; user: User } | { ok: false; error: 'invalidCredentials' };

/** Проверка почты и пароля без открытия сессии — её вызывает и общий сервер. */
export async function authenticate(email: string, password: string): Promise<LoginResult> {
  const db = await getDb();
  const row = await db.getFirstAsync<UserRow & { password_hash: string; password_salt: string }>(
    `SELECT ${USER_COLUMNS}, password_hash, password_salt FROM users WHERE email = ?`,
    email.trim(),
  );
  if (!row || (await hashPassword(password, row.password_salt)) !== row.password_hash) {
    return { ok: false, error: 'invalidCredentials' };
  }
  return { ok: true, user: toUser(row) };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await authenticate(email, password);
  if (res.ok) await setSessionUserId(res.user.id);
  return res;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`, email.trim());
  return row ? toUser(row) : null;
}

export async function logout(): Promise<void> {
  await setSessionUserId(null);
}

export type RegisterInput = { fullName: string; email: string; telegram: string; password: string };

export type RegisterError = 'emailInvalid' | 'emailTaken' | 'passwordShort';

export type RegisterResult = { ok: true; user: User } | { ok: false; errors: RegisterError[] };

export function validateRegistration(input: RegisterInput): RegisterError[] {
  const errors: RegisterError[] = [];
  if (!isValidEmail(input.email)) errors.push('emailInvalid');
  if (input.password.length < MIN_PASSWORD_LENGTH) errors.push('passwordShort');
  return errors;
}

const AVATAR_COLORS: CoverColor[] = ['teal', 'violet', 'terracotta', 'sky', 'green', 'rose', 'ochre', 'graphite'];

/** Создание аккаунта читателя без открытия сессии — её вызывает и общий сервер, и MCP. */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const errors = validateRegistration(input);
  if (errors.length === 0 && (await isEmailTaken(input.email))) errors.push('emailTaken');
  if (errors.length > 0) return { ok: false, errors };

  const db = await getDb();
  const salt = makeSalt();
  const hash = await hashPassword(input.password, salt);
  const telegram = input.telegram.trim().replace(/^@/, '') || null;
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM users');
  const color = AVATAR_COLORS[(count?.n ?? 0) % AVATAR_COLORS.length];
  const res = await db.runAsync(
    `INSERT INTO users (role, full_name, email, telegram, telegram_enabled, password_hash, password_salt,
      password_changed_at, avatar_color)
     VALUES ('student', ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.fullName.trim(),
    input.email.trim(),
    telegram,
    telegram ? 1 : 0,
    hash,
    salt,
    now(),
    color,
  );
  const user = await getUser(res.lastInsertRowId);
  if (!user) throw new Error('Пользователь не создан');
  return { ok: true, user };
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const res = await registerUser(input);
  if (res.ok) await setSessionUserId(res.user.id);
  return res;
}

/** Сброс пароля: письма не отправляются (spec.md, Q2) — только проверяем формат адреса. */
export function requestPasswordReset(email: string): { ok: boolean } {
  return { ok: isValidEmail(email) };
}

export type ProfileInput = {
  fullName: string;
  groupName: string;
  email: string;
  telegram: string;
};

export type ProfileError = 'emailInvalid' | 'emailTaken';

export async function updateProfile(
  userId: number,
  input: ProfileInput,
): Promise<{ ok: true } | { ok: false; errors: ProfileError[] }> {
  if (!isValidEmail(input.email)) return { ok: false, errors: ['emailInvalid'] };
  if (await isEmailTaken(input.email, userId)) return { ok: false, errors: ['emailTaken'] };
  const db = await getDb();
  const telegram = input.telegram.trim().replace(/^@/, '') || null;
  await db.runAsync(
    `UPDATE users SET full_name = ?, group_name = ?, email = ?, telegram = ?,
      telegram_enabled = CASE WHEN ? IS NULL THEN 0 ELSE telegram_enabled END
     WHERE id = ?`,
    input.fullName.trim(),
    input.groupName.trim() || null,
    input.email.trim(),
    telegram,
    telegram,
    userId,
  );
  return { ok: true };
}

export async function setTelegramEnabled(userId: number, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE users SET telegram_enabled = ? WHERE id = ?', enabled ? 1 : 0, userId);
}

export async function setAvatar(userId: number, uri: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE users SET avatar_uri = ? WHERE id = ?', uri, userId);
}

/** Инициалы для аватара: «Анна Смирнова» → «АС». */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toLocaleUpperCase('ru-RU'))
    .join('');
}
