import { Tabs } from 'expo-router';

// Свой TabBar из дизайн-системы подключается на шаге 8.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="search" options={{ title: 'Поиск' }} />
      <Tabs.Screen name="bookings/index" options={{ title: 'Мои брони' }} />
      <Tabs.Screen name="profile/index" options={{ title: 'Профиль' }} />
    </Tabs>
  );
}
