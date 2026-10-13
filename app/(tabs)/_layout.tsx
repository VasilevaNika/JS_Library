import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, type TabItem } from '@/components';
import { getHomeSummary } from '@/db';
import { useSession } from '@/hooks/useSession';
import type { IconName } from '@/components/Icon';

const TABS: { name: string; icon: IconName; label: string }[] = [
  { name: 'search', icon: 'search', label: 'Поиск' },
  { name: 'bookings/index', icon: 'bookmark', label: 'Мои брони' },
  { name: 'profile/index', icon: 'user', label: 'Профиль' },
];

export default function TabsLayout() {
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const [badge, setBadge] = useState(0);
  const [tick, setTick] = useState(0);

  // Бейдж активных броней обновляется при входе/выходе и при каждом переключении вкладки.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    getHomeSummary(user.id)
      .then((s) => alive && setBadge(s.activeCount))
      .catch(() => alive && setBadge(0));
    return () => {
      alive = false;
    };
  }, [user, tick]);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      screenListeners={{ focus: () => setTick((t) => t + 1) }}
      tabBar={({ state, navigation }) => {
        const tabs: TabItem[] = TABS.map((t, i) => ({
          key: t.name,
          icon: t.icon,
          label: t.label,
          active: state.index === i,
          badge: t.name === 'bookings/index' && user && badge > 0 ? badge : undefined,
          onPress: () => {
            // Профиль гостя ведёт на вход (spec.md, S10).
            if (t.name === 'profile/index' && !user) {
              navigation.getParent()?.navigate('login');
              return;
            }
            const route = state.routes[i];
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (state.index !== i && !event.defaultPrevented) navigation.navigate(route.name);
            else if (state.index === i && t.name === 'search') navigation.navigate('search', { screen: 'index' });
          },
        }));
        return <TabBar tabs={tabs} bottom={Math.max(20, insets.bottom)} />;
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}
