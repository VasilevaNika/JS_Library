// Функции данных, которые общий сервер (server/) выполняет по запросу приложения и MCP-сервера.
// Сессия устройства и dev-переключатели сюда не входят — они всегда локальные.
export const REMOTE_FUNCTIONS = [
  // читатели
  'authenticate',
  'registerUser',
  'getUser',
  'getUserByEmail',
  'updateProfile',
  'setTelegramEnabled',
  'setAvatar',
  // каталог
  'searchBooks',
  'similarBooks',
  'getBook',
  'recentlyReturned',
  'countBooks',
  'listCatalog',
  'listTopics',
  'findBookByIsbn',
  'findBookByTitleAuthor',
  'addBook',
  'updateBook',
  'getActiveUsage',
  'removeBook',
  // брони и очередь
  'getBookCard',
  'createBooking',
  'cancelBooking',
  'markReturned',
  'getQueuePosition',
  'joinQueue',
  'leaveQueue',
  'getMyBookings',
  'getHomeSummary',
  'getBooking',
  'getStatusHistory',
  'getBookingByCode',
  // модератор
  'getJournal',
  'getJournalRecord',
  'lookupForIssue',
  'defaultDueDate',
  'issueBookings',
  'issueWithoutBooking',
  'getReconciliation',
  'closeOnShelf',
  'markMissing',
  'postponeCheck',
  'checkImportRows',
  'commitImport',
  'getSettings',
  // журнал действий MCP
  'logAudit',
  'listAudit',
] as const;

export type RemoteFunction = (typeof REMOTE_FUNCTIONS)[number];
