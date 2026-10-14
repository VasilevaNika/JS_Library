import { Redirect } from 'expo-router';

import { useSession } from '@/hooks/useSession';

/** Стартовый маршрут: модератор сразу попадает в журнал, остальные — на поиск. */
export default function Index() {
  const { user } = useSession();
  if (user === undefined) return null;
  return <Redirect href={user?.role === 'moderator' ? '/moderator/journal' : '/search'} />;
}
