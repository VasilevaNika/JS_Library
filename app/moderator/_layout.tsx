import { Stack } from 'expo-router';

// Вкладки «Журнал · Выдача и сверка · Каталог» — часть шапки модератора (шаг 8).
export default function ModeratorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="journal" />
      <Stack.Screen name="issue" />
      <Stack.Screen name="catalog/index" />
      <Stack.Screen name="catalog/import" options={{ animation: 'default' }} />
      <Stack.Screen
        name="catalog/book"
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
    </Stack>
  );
}
