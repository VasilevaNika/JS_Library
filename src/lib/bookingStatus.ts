// Подписи и тона статусов записи для экранов модератора (журнал, сверка, панель записи).
import type { BookingStatus } from '@/db';
import type { StatusTone } from '@/theme/tokens';

export const JOURNAL_STATUS: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  reserved: { label: 'Забронирована', tone: 'busy' },
  issued: { label: 'Выдана', tone: 'busy' },
  overdue: { label: 'Просрочено', tone: 'overdue' },
  awaiting_check: { label: 'Ожидает сверки', tone: 'neutral' },
  expired: { label: 'Истекла', tone: 'neutral' },
  closed: { label: 'Закрыта', tone: 'neutral' },
  cancelled: { label: 'Отменена', tone: 'neutral' },
};

/** Цвет точки события в истории статусов. */
export const EVENT_TONE: Record<BookingStatus, StatusTone> = {
  reserved: 'busy',
  issued: 'busy',
  overdue: 'overdue',
  awaiting_check: 'neutral',
  expired: 'neutral',
  closed: 'available',
  cancelled: 'neutral',
};
