// Схема базы и миграции. Версия схемы хранится в PRAGMA user_version.
// Новые изменения — только новой записью в конце массива, старые не править.

export const MIGRATIONS: readonly string[] = [
  // 1 — исходная схема
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK (role IN ('student', 'moderator')),
    full_name TEXT NOT NULL,
    group_name TEXT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    telegram TEXT,
    telegram_enabled INTEGER NOT NULL DEFAULT 0,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_changed_at INTEGER NOT NULL,
    ticket_number TEXT,
    avatar_uri TEXT,
    avatar_color TEXT NOT NULL DEFAULT 'teal'
  );

  CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    authors_full TEXT NOT NULL,
    authors_short TEXT NOT NULL,
    authors_info TEXT NOT NULL,
    isbn TEXT,
    year INTEGER,
    copies_total INTEGER NOT NULL CHECK (copies_total >= 0),
    cover_color TEXT NOT NULL,
    cover_uri TEXT,
    topic TEXT NOT NULL,
    shelf TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    search_text TEXT NOT NULL
  );
  CREATE INDEX books_isbn ON books (isbn);

  CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users (id),
    book_id INTEGER NOT NULL REFERENCES books (id),
    status TEXT NOT NULL CHECK (status IN
      ('reserved', 'issued', 'overdue', 'awaiting_check', 'expired', 'closed', 'cancelled')),
    from_queue INTEGER NOT NULL DEFAULT 0,
    reserved_at INTEGER,
    pickup_until INTEGER,
    issued_at INTEGER,
    due_at INTEGER,
    return_marked_at INTEGER,
    closed_at INTEGER,
    cancelled_at INTEGER,
    expired_at INTEGER,
    reminder_sent_at INTEGER,
    check_postponed INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX bookings_user ON bookings (user_id);
  CREATE INDEX bookings_book_status ON bookings (book_id, status);

  CREATE TABLE status_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    at INTEGER NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('student', 'moderator', 'system')),
    actor_id INTEGER REFERENCES users (id),
    due_at INTEGER,
    comment TEXT
  );
  CREATE INDEX status_events_booking ON status_events (booking_id);

  CREATE TABLE queue_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users (id),
    book_id INTEGER NOT NULL REFERENCES books (id),
    created_at INTEGER NOT NULL,
    UNIQUE (user_id, book_id)
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE app_state (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  `,
];
