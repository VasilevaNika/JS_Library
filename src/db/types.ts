import type { CoverColor } from '@/theme/tokens';

/** Время в базе — миллисекунды Unix epoch. */
export type Millis = number;

export type UserRole = 'student' | 'moderator';

export type User = {
  id: number;
  role: UserRole;
  fullName: string;
  groupName: string | null;
  email: string;
  telegram: string | null;
  telegramEnabled: boolean;
  passwordChangedAt: Millis;
  ticketNumber: string | null;
  avatarUri: string | null;
  avatarColor: CoverColor;
};

export type Book = {
  id: number;
  title: string;
  authorsFull: string;
  authorsShort: string;
  authorsInfo: string;
  isbn: string | null;
  year: number | null;
  copiesTotal: number;
  coverColor: CoverColor;
  coverUri: string | null;
  topic: string;
  shelf: string;
  addedAt: Millis;
};

/** Статус записи журнала. */
export type BookingStatus =
  | 'reserved'
  | 'issued'
  | 'overdue'
  | 'awaiting_check'
  | 'expired'
  | 'closed'
  | 'cancelled';

export const ACTIVE_STATUSES: readonly BookingStatus[] = ['reserved', 'issued', 'overdue'];

export type Booking = {
  id: number;
  code: string;
  userId: number;
  bookId: number;
  status: BookingStatus;
  fromQueue: boolean;
  reservedAt: Millis | null;
  pickupUntil: Millis | null;
  issuedAt: Millis | null;
  dueAt: Millis | null;
  returnMarkedAt: Millis | null;
  closedAt: Millis | null;
  cancelledAt: Millis | null;
  expiredAt: Millis | null;
  reminderSentAt: Millis | null;
  checkPostponed: boolean;
};

export type ActorType = 'student' | 'moderator' | 'system';

export type StatusEvent = {
  id: number;
  bookingId: number;
  status: BookingStatus;
  at: Millis;
  actorType: ActorType;
  actorId: number | null;
  actorName: string | null;
  dueAt: Millis | null;
  comment: string | null;
};

export type QueueEntry = {
  id: number;
  userId: number;
  bookId: number;
  createdAt: Millis;
};

/** Наличие книги: счётчики StatBlock «На полке / Выдано / Очередь». */
export type Availability = {
  onShelf: number;
  reserved: number;
  issued: number;
  queue: number;
};

/** Статус книги в студенческих списках: «В наличии» / «Занята» / «Выдана». */
export type BookPublicStatus = 'available' | 'busy' | 'issued';

/** Статус книги в каталоге модератора: «В наличии» / «Всё занято» / «Всё выдано». */
export type CatalogStatus = 'available' | 'allReserved' | 'allIssued';

export type BookWithAvailability = Book & {
  availability: Availability;
  publicStatus: BookPublicStatus;
  catalogStatus: CatalogStatus;
  /** Ближайшее событие для меты строки: когда освободится бронь или когда вернут выданную. */
  nextFreeAt: Millis | null;
  lastReturnedAt: Millis | null;
};

export type BookingWithBook = Booking & { book: Book };

export type BookingWithBookAndUser = BookingWithBook & { user: User };

export type LibrarySettings = {
  location: string;
  locationShort: string;
  hours: string;
  closingTime: string;
  pickupHours: number;
  loanDays: number;
  maxActiveBookings: number;
  queueHoldHours: number;
  rulesUrl: string | null;
};
