// Живое обновление в удалённом режиме: сервер сообщает, что данные изменились (например, Claude
// оформил бронь через MCP), и открытые экраны перезагружают данные без перезагрузки страницы.
// В браузере — поток событий EventSource (GET /events), на телефоне его нет — раз в 3 секунды
// сверяем номер версии (GET /version). В локальном режиме подписка ничего не делает.
import { API_URL } from './remote';

type Listener = () => void;

const listeners = new Set<Listener>();
let stop: (() => void) | null = null;

function notify(): void {
  for (const l of listeners) l();
}

/** Минимальная часть браузерного EventSource, которой пользуемся. В типах React Native его нет. */
type EventSourceLike = { onmessage: ((e: { data: string }) => void) | null; close(): void };
type EventSourceCtor = new (url: string) => EventSourceLike;

function start(url: string): () => void {
  const ES = (globalThis as { EventSource?: EventSourceCtor }).EventSource;
  let version: number | null = null;
  const onVersion = (v: number) => {
    // Первое значение — текущая версия при подключении, обновлять нечего.
    if (version !== null && v !== version) notify();
    version = v;
  };

  if (ES) {
    const source = new ES(`${url}/events`);
    source.onmessage = (e) => {
      try {
        onVersion((JSON.parse(e.data) as { version: number }).version);
      } catch {
        // Посторонние сообщения пропускаем.
      }
    };
    return () => source.close();
  }

  const timer = setInterval(() => {
    fetch(`${url}/version`)
      .then((r) => r.json() as Promise<{ result: number }>)
      .then((b) => onVersion(b.result))
      .catch(() => {
        // Сервер недоступен — попробуем в следующий раз.
      });
  }, 3000);
  return () => clearInterval(timer);
}

/** Подписаться на изменения данных на сервере. Возвращает функцию отписки. */
export function subscribeChanges(listener: Listener): () => void {
  if (!API_URL) return () => {};
  listeners.add(listener);
  if (!stop) stop = start(API_URL);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stop) {
      stop();
      stop = null;
    }
  };
}
