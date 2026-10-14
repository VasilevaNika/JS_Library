// Тексты для человека: ошибки форм и пояснения к состоянию книги.
// Одни и те же функции используют экраны приложения и MCP-сервер, поэтому формулировки совпадают дословно.
import { dayMonth, dayMonthTime, plural } from '@/lib/format';
import type { StatusTone } from '@/theme/tokens';

import type { BookCard, CreateBookingResult } from './bookings';
import type { BookInputError } from './books';
import type { Book, BookingWithBook, LibrarySettings } from './types';
import { MIN_PASSWORD_LENGTH, type ProfileError, type RegisterError } from './users';

export const TEXT = {
  loginInvalid: 'Почта или пароль не подходят.',
  emailInvalid: 'Проверьте адрес — в нём нет @',
  emailTaken: 'Этот адрес уже зарегистрирован.',
  passwordShort: `Минимум ${MIN_PASSWORD_LENGTH} символов`,
  titleRequired: 'Укажите название.',
  authorRequired: 'Укажите автора — по нему студенты ищут книгу.',
  copiesInvalid: 'Укажите количество экземпляров — целое число от 1.',
  bookingRace: 'Книгу только что забронировали. Можно встать в очередь.',
  bookingAlreadyMine: 'Эта книга уже забронирована или выдана вам.',
  overdueOther:
    'Срок возврата прошёл, книгу ещё не вернули. Встаньте в очередь — мы напишем, как только она появится.',
} as const;

export function bookingLimitText(max: number): string {
  return `У вас уже ${max} активные брони. Заберите или отмените одну из них.`;
}

/** Ошибка «Забронировать» — тот же текст, что в плашке карточки книги. */
export function createBookingErrorText(
  error: Extract<CreateBookingResult, { ok: false }>['error'],
  settings: LibrarySettings,
): string {
  if (error === 'limit') return bookingLimitText(settings.maxActiveBookings);
  if (error === 'alreadyMine') return TEXT.bookingAlreadyMine;
  return TEXT.bookingRace;
}

export function registerErrorText(error: RegisterError): string {
  return error === 'emailInvalid' ? TEXT.emailInvalid : error === 'emailTaken' ? TEXT.emailTaken : TEXT.passwordShort;
}

export function profileErrorText(error: ProfileError): string {
  return error === 'emailInvalid' ? TEXT.emailInvalid : TEXT.emailTaken;
}

export function bookInputErrorText(error: BookInputError): string {
  return error === 'titleRequired'
    ? TEXT.titleRequired
    : error === 'authorRequired'
      ? TEXT.authorRequired
      : TEXT.copiesInvalid;
}

export function duplicateIsbnText(book: Pick<Book, 'title' | 'copiesTotal'>): string {
  return `Книга с этим ISBN уже есть в каталоге: «${book.title}», ${book.copiesTotal} экз.`;
}

export function removeBlockedText(usage: { reserved: number; issued: number }): string {
  return `Нельзя, пока на книгу есть активные брони: ${usage.reserved} ${plural(usage.reserved, ['бронь', 'брони', 'броней'])}, ${usage.issued} ${plural(usage.issued, ['выдача', 'выдачи', 'выдач'])}.`;
}

export function issueNotFoundText(query: string): string {
  return `Бронь с кодом ${query} не найдена. Проверьте код или найдите по имени студента.`;
}

export function expiredBookingText(booking: BookingWithBook, bookAvailable: boolean): string {
  const when = dayMonth(booking.expiredAt ?? booking.pickupUntil ?? 0);
  return `Бронь ${booking.code} истекла ${when}. Книга «${booking.book.title}» сейчас ${bookAvailable ? 'в наличии' : 'не в наличии'}.`;
}

/** Пояснение к состоянию книги для текущего читателя — плашка над кнопкой в карточке книги. */
export function bookStateNotice(
  card: BookCard,
  settings: LibrarySettings,
  race = false,
): { text: string; tone: StatusTone; showBookingsLink?: boolean } | null {
  const mine = card.myBooking;
  const state = race && card.state === 'available' ? 'race' : card.state;
  switch (state) {
    case 'mine':
      return mine?.pickupUntil ? { text: `Ваша бронь. Книга ждёт вас до ${dayMonthTime(mine.pickupUntil)}`, tone: 'available' } : null;
    case 'limit':
      return { text: bookingLimitText(settings.maxActiveBookings), tone: 'neutral', showBookingsLink: true };
    case 'race':
      return { text: TEXT.bookingRace, tone: 'busy' };
    case 'reserved':
      return {
        text: card.reservedUntil
          ? `Книга забронирована. Если её не заберут, она освободится ${dayMonthTime(card.reservedUntil)}.`
          : 'Книга забронирована.',
        tone: 'neutral',
      };
    case 'issued':
      return { text: card.dueAt ? `Книга на руках. Вернут до ${dayMonth(card.dueAt)}.` : 'Книга на руках.', tone: 'neutral' };
    case 'overdueOther':
      return { text: TEXT.overdueOther, tone: 'neutral' };
    case 'inQueue':
      return { text: `Вы в очереди: ${card.queuePosition}-й. Мы напишем, когда книга освободится.`, tone: 'available' };
    case 'withMe':
      if (mine?.status === 'overdue' && mine.dueAt) return { text: `Срок возврата прошёл ${dayMonth(mine.dueAt)}.`, tone: 'overdue' };
      return mine?.dueAt ? { text: `Книга у вас. Вернуть до ${dayMonth(mine.dueAt)}.`, tone: 'busy' } : null;
    default:
      return null;
  }
}
