import type { Millis } from './types';

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

/** Текущее время. Через функцию — чтобы проще подменять в отладке. */
export function now(): Millis {
  return Date.now();
}

export function startOfDay(t: Millis): Millis {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(t: Millis): Millis {
  return startOfDay(t) + DAY - 1;
}

export function addDays(t: Millis, days: number): Millis {
  const d = new Date(t);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Время дня `days` дней от `base` в часы `h:m`. */
export function dayAt(base: Millis, days: number, h: number, m = 0): Millis {
  const d = new Date(startOfDay(addDays(base, days)));
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/** Суббота или воскресенье — библиотека закрыта. */
export function isWeekend(t: Millis): boolean {
  const day = new Date(t).getDay();
  return day === 0 || day === 6;
}

/** Последняя пятница не позже `t` (для предупреждения о выходных). */
export function previousWorkday(t: Millis): Millis {
  let d = t;
  while (isWeekend(d)) d = addDays(d, -1);
  return d;
}
