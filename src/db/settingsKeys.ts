import type { LibrarySettings } from './types';

/** Ключи таблицы settings. Отдельный модуль — чтобы seed не тянул client.ts. */
export const SETTINGS_KEYS: Record<keyof LibrarySettings, string> = {
  location: 'location',
  locationShort: 'location_short',
  hours: 'hours',
  closingTime: 'closing_time',
  pickupHours: 'pickup_hours',
  loanDays: 'loan_days',
  maxActiveBookings: 'max_active_bookings',
  queueHoldHours: 'queue_hold_hours',
  rulesUrl: 'rules_url',
};
