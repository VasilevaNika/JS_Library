// Ответы инструментов — обычный текст на русском, теми же словами, что на экранах приложения.
import type { BookingWithBook, BookingWithBookAndUser, BookWithAvailability } from '@/db/api';
import { JOURNAL_STATUS } from '@/lib/bookingStatus';
import { dayMonth, dayMonthShort, dayMonthTime } from '@/lib/format';

/** Строка книги: как в результатах поиска — статус и когда освободится. */
export function bookLine(b: BookWithAvailability): string {
  const { onShelf, queue } = b.availability;
  const when = b.nextFreeAt && b.nextFreeAt > Date.now() ? dayMonthShort(b.nextFreeAt) : null;
  let status: string;
  if (b.publicStatus === 'available') status = `В наличии (на полке ${onShelf} из ${b.copiesTotal})`;
  else if (b.publicStatus === 'busy') status = when ? `Занята, освободится ${when}` : 'Занята';
  else status = when ? `Выдана, вернут до ${when}` : 'Выдана';
  const year = b.year ? `, ${b.year}` : '';
  const isbn = b.isbn ? `, ISBN ${b.isbn}` : '';
  const queueText = queue > 0 ? `, в очереди ${queue}` : '';
  return `• [id ${b.id}] «${b.title}» — ${b.authorsShort}${year}${isbn}. ${status}${queueText}.`;
}

/** Срок, важный для записи: до какого времени забрать или вернуть. */
function deadline(b: BookingWithBook): string {
  if (b.status === 'reserved' && b.pickupUntil) return `, ждёт до ${dayMonthTime(b.pickupUntil)}`;
  if ((b.status === 'issued' || b.status === 'overdue') && b.dueAt) return `, вернуть до ${dayMonth(b.dueAt)}`;
  if (b.status === 'awaiting_check' && b.returnMarkedAt) return `, возврат отмечен ${dayMonth(b.returnMarkedAt)}`;
  return '';
}

export function bookingLine(b: BookingWithBook): string {
  return `• Код ${b.code} — «${b.book.title}» (${b.book.authorsShort}): ${JOURNAL_STATUS[b.status].label}${deadline(b)}.`;
}

export function journalLine(b: BookingWithBookAndUser): string {
  const group = b.user.groupName ? `, ${b.user.groupName}` : '';
  return `${bookingLine(b)} Читатель: ${b.user.fullName}${group}.`;
}

export const CONFIRM_HINT = 'Ничего не изменено. Чтобы выполнить, вызовите инструмент ещё раз с confirm: true.';
