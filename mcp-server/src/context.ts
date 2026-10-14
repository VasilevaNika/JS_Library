// Кто работает с сервером. Пароль не спрашивается: Claude Desktop запускает сервер на компьютере
// пользователя, а адрес почты и роль задаются в его конфигурации (LIBRARY_USER_EMAIL, LIBRARY_ROLE).
import { getUserByEmail, type User, type UserRole } from '@/db/api';

export type Context = {
  email: string;
  /** Роль из LIBRARY_ROLE. Права модератора есть, только если и в базе этот пользователь — модератор. */
  role: UserRole | null;
};

/** Ошибка, которую нужно показать человеку как есть. */
export class UserError extends Error {}

export function contextFromEnv(env: NodeJS.ProcessEnv = process.env): Context {
  const email = env.LIBRARY_USER_EMAIL?.trim() ?? '';
  const role = env.LIBRARY_ROLE === 'student' || env.LIBRARY_ROLE === 'moderator' ? env.LIBRARY_ROLE : null;
  return { email, role };
}

export async function currentUser(ctx: Context): Promise<User> {
  if (!ctx.email) {
    throw new UserError('Не задан пользователь: укажите LIBRARY_USER_EMAIL в настройках MCP-сервера.');
  }
  const user = await getUserByEmail(ctx.email);
  if (!user) {
    throw new UserError(
      `Пользователь ${ctx.email} не найден. Зарегистрируйтесь инструментом register или проверьте LIBRARY_USER_EMAIL.`,
    );
  }
  return user;
}

/** Роль, с которой выполняются действия: из LIBRARY_ROLE, но не выше, чем в базе. */
export function effectiveRole(ctx: Context, user: User): UserRole {
  if (user.role === 'moderator' && ctx.role !== 'student') return 'moderator';
  return 'student';
}

export async function requireRole(ctx: Context, role: UserRole): Promise<User> {
  const user = await currentUser(ctx);
  const actual = effectiveRole(ctx, user);
  if (actual === role) return user;
  if (role === 'moderator') {
    throw new UserError(
      `Это действие доступно только модератору библиотеки. Сейчас вы работаете как студент (${user.email}).`,
    );
  }
  throw new UserError(
    `Это действие доступно только читателю. Сейчас вы работаете как модератор (${user.email}) — у модератора нет своих броней.`,
  );
}
