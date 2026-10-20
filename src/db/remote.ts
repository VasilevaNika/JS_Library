// Удалённый режим: функции данных выполняет общий сервер (server/). Адрес сервера:
// у приложения — EXPO_PUBLIC_API_URL (Expo подставляет его при сборке), у MCP-сервера — LIBRARY_API_URL.
// Без адреса всё работает локально, как раньше.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || process.env.LIBRARY_API_URL)?.replace(/\/+$/, '') || null;

/** Сервер библиотеки не отвечает: не запущен или неверный адрес. */
export class RemoteUnavailableError extends Error {
  constructor(url: string) {
    super(`Сервер библиотеки не отвечает (${url}). Запустите его командой npm run server в папке проекта.`);
    this.name = 'RemoteUnavailableError';
  }
}

type RpcResponse = { ok: true; result: unknown } | { ok: false; error: string };

export async function callRemote<T>(name: string, args: unknown[]): Promise<T> {
  if (!API_URL) throw new Error('Адрес сервера не задан');
  let res: Response;
  try {
    res = await fetch(`${API_URL}/rpc/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args }),
    });
  } catch {
    throw new RemoteUnavailableError(API_URL);
  }
  const body = (await res.json()) as RpcResponse;
  if (!body.ok) throw new Error(body.error);
  // Результат — JSON того же значения, что вернула функция на сервере; тип задаёт вызывающий код.
  return body.result as T;
}
