// Удалённый режим: если задан EXPO_PUBLIC_API_URL, функции данных выполняет общий сервер (server/),
// и приложение видит ту же базу, что и MCP-сервер. Без переменной всё работает локально, как раньше.
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || null;

type RpcResponse = { ok: true; result: unknown } | { ok: false; error: string };

export async function callRemote<T>(name: string, args: unknown[]): Promise<T> {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL не задан');
  const res = await fetch(`${API_URL}/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args }),
  });
  const body = (await res.json()) as RpcResponse;
  if (!body.ok) throw new Error(body.error);
  // Результат — JSON того же значения, что вернула функция на сервере; тип задаёт вызывающий код.
  return body.result as T;
}
