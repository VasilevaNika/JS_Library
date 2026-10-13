import { StubScreen } from '@/components/StubScreen';

export default function HomeScreen() {
  return (
    <StubScreen
      title="S1 Главная"
      links={[
        { label: 'Результаты', href: { pathname: '/search/results', params: { q: 'алгоритмы' } } },
        { label: 'Карточка книги', href: '/book/1' },
        { label: 'Меню', href: '/menu' },
        { label: 'Демо компонентов', href: '/dev/components' },
      ]}
    />
  );
}
