// Форматы дат и слов из дизайн-системы:
// «в карточке „18 сентября, 20:00“, в списке „до 16 сент.“, на десктопе „18.09, 20:00“».

const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const MONTHS_SHORT = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const WEEKDAYS_GEN = ['воскресенья', 'понедельника', 'вторника', 'среды', 'четверга', 'пятницы', 'субботы'];

const pad = (n: number) => String(n).padStart(2, '0');

/** «18 сентября» */
export function dayMonth(t: number): string {
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** «20:00» */
export function time(t: number): string {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** «18 сентября, 20:00» */
export function dayMonthTime(t: number): string {
  return `${dayMonth(t)}, ${time(t)}`;
}

/** «17 сент.» */
export function dayMonthShort(t: number): string {
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** «18.09» */
export function numericDay(t: number): string {
  const d = new Date(t);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

/** «18.09, 20:00» */
export function numericDayTime(t: number): string {
  return `${numericDay(t)}, ${time(t)}`;
}

/** «30.09.2026» */
export function numericDate(t: number): string {
  const d = new Date(t);
  return `${numericDay(t)}.${d.getFullYear()}`;
}

/** «Среда, 16 сентября» */
export function weekdayDayMonth(t: number): string {
  return `${WEEKDAYS[new Date(t).getDay()]}, ${dayMonth(t)}`;
}

/** «пятницы, 18 сентября, 20:00» — для «до пятницы, …» */
export function weekdayGenDayMonthTime(t: number): string {
  return `${WEEKDAYS_GEN[new Date(t).getDay()]}, ${dayMonthTime(t)}`;
}

/** «пятница» в именительном — для «Последний шанс забрать — пятница, 18 сентября». */
export function weekdayLower(t: number): string {
  return WEEKDAYS[new Date(t).getDay()].toLocaleLowerCase('ru-RU');
}

/** Склонение по числу: plural(2, ['бронь', 'брони', 'броней']) → «брони». */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
