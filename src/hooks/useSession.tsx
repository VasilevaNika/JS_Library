import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getCurrentUser, logout as dbLogout, subscribeChanges, type User } from '@/db';

type Session = {
  /** undefined — ещё читаем сессию; null — гость. */
  user: User | null | undefined;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setUser(await getCurrentUser());
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    await dbLogout();
    setUser(null);
  }, []);

  useEffect(() => {
    let alive = true;
    getCurrentUser()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null));
    return () => {
      alive = false;
    };
  }, []);

  // Профиль могли изменить через MCP — подтягиваем имя и почту. Ошибку сети пропускаем, чтобы не разлогинить.
  useEffect(
    () =>
      subscribeChanges(() => {
        getCurrentUser().then(setUser, () => {});
      }),
    [],
  );

  const value = useMemo(() => ({ user, refresh, logout }), [user, refresh, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession вне SessionProvider');
  return ctx;
}
