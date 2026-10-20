import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { subscribeChanges } from '@/db';

export type QueryState<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'error'; data: T | undefined; error: unknown }
  | { status: 'ready'; data: T; error: undefined };

/**
 * Загружает данные из src/db при фокусе экрана и при смене `deps`.
 * «Загрузка» показывается только при первом запросе — повторные обновляют данные без мигания.
 * В удалённом режиме экран в фокусе ещё и перезагружается, когда данные изменились на сервере
 * (например, Claude отменил бронь через MCP). Экраны не в фокусе обновятся, когда к ним вернутся.
 */
export function useQuery<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<QueryState<T>>({ status: 'loading', data: undefined, error: undefined });
  const seq = useRef(0);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(async (opts?: { showLoading?: boolean }) => {
    const id = ++seq.current;
    if (opts?.showLoading) setState({ status: 'loading', data: undefined, error: undefined });
    try {
      const data = await loadRef.current();
      if (id === seq.current) setState({ status: 'ready', data, error: undefined });
    } catch (error) {
      if (id === seq.current) setState((prev) => ({ status: 'error', data: prev.data, error }));
    }
  }, []);

  const focused = useRef(false);
  useEffect(() => subscribeChanges(() => focused.current && void reload()), [reload]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void reload();
      return () => {
        focused.current = false;
      };
      // Зависимости запроса передаёт экран; reload стабилен.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, ...deps]),
  );

  return { ...state, reload };
}
