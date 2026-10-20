// Публичный API данных для экранов и MCP-сервера. Экраны импортируют только отсюда, SQLite напрямую не трогают.
// Без адреса сервера (см. remote.ts) все функции локальные (src/db/api.ts). С ним функции из REMOTE_FUNCTIONS
// выполняет общий сервер, а сессия устройства и dev-переключатели остаются в локальной базе.
// Ниже функции из REMOTE_FUNCTIONS объявлены заново и по правилам ES-модулей перекрывают одноимённые
// из export * — это и есть переключение режима. Правило import/export считает это дублированием.
/* eslint-disable import/export, import/namespace -- namespace: функцию берём по имени из списка REMOTE_FUNCTIONS */
import * as api from './api';
import { API_URL, callRemote } from './remote';
import type { RemoteFunction } from './remoteNames';

export * from './api';
export { subscribeChanges } from './live';

type Api = typeof api;

function via<K extends RemoteFunction>(name: K): Api[K] {
  if (!API_URL) return api[name];
  // Сигнатура та же, что у локальной функции: сервер вызывает её с теми же аргументами.
  return ((...args: unknown[]) => callRemote(name, args)) as unknown as Api[K];
}

export const authenticate = via('authenticate');
export const registerUser = via('registerUser');
export const getUser = via('getUser');
export const getUserByEmail = via('getUserByEmail');
export const updateProfile = via('updateProfile');
export const setTelegramEnabled = via('setTelegramEnabled');
export const setAvatar = via('setAvatar');
export const searchBooks = via('searchBooks');
export const similarBooks = via('similarBooks');
export const getBook = via('getBook');
export const recentlyReturned = via('recentlyReturned');
export const countBooks = via('countBooks');
export const listCatalog = via('listCatalog');
export const listTopics = via('listTopics');
export const findBookByIsbn = via('findBookByIsbn');
export const findBookByTitleAuthor = via('findBookByTitleAuthor');
export const addBook = via('addBook');
export const updateBook = via('updateBook');
export const getActiveUsage = via('getActiveUsage');
export const removeBook = via('removeBook');
export const getBookCard = via('getBookCard');
export const createBooking = via('createBooking');
export const cancelBooking = via('cancelBooking');
export const markReturned = via('markReturned');
export const getQueuePosition = via('getQueuePosition');
export const joinQueue = via('joinQueue');
export const leaveQueue = via('leaveQueue');
export const getMyBookings = via('getMyBookings');
export const getHomeSummary = via('getHomeSummary');
export const getBooking = via('getBooking');
export const getStatusHistory = via('getStatusHistory');
export const getBookingByCode = via('getBookingByCode');
export const getJournal = via('getJournal');
export const getJournalRecord = via('getJournalRecord');
export const lookupForIssue = via('lookupForIssue');
export const defaultDueDate = via('defaultDueDate');
export const issueBookings = via('issueBookings');
export const issueWithoutBooking = via('issueWithoutBooking');
export const getReconciliation = via('getReconciliation');
export const closeOnShelf = via('closeOnShelf');
export const markMissing = via('markMissing');
export const postponeCheck = via('postponeCheck');
export const checkImportRows = via('checkImportRows');
export const commitImport = via('commitImport');
export const getSettings = via('getSettings');
export const logAudit = via('logAudit');
export const listAudit = via('listAudit');

export const login: Api['login'] = API_URL
  ? async (email, password) => {
      const res = await callRemote<api.LoginResult>('authenticate', [email, password]);
      if (res.ok) await api.setSessionUserId(res.user.id);
      return res;
    }
  : api.login;

export const register: Api['register'] = API_URL
  ? async (input) => {
      const res = await callRemote<api.RegisterResult>('registerUser', [input]);
      if (res.ok) await api.setSessionUserId(res.user.id);
      return res;
    }
  : api.register;

export const getCurrentUser: Api['getCurrentUser'] = API_URL
  ? async () => {
      const id = await api.getSessionUserId();
      return id === null ? null : getUser(id);
    }
  : api.getCurrentUser;

/** В удалённом режиме сбрасывается и база сервера (к тестовым данным), и локальная сессия. */
export const resetDatabase: Api['resetDatabase'] = API_URL
  ? async () => {
      await callRemote('__reset', []);
      await api.resetDatabase();
    }
  : api.resetDatabase;
