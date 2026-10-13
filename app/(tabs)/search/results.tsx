import { StubScreen } from '@/components/StubScreen';

export default function ResultsScreen() {
  return (
    <StubScreen
      title="S2 Результаты поиска"
      links={[
        { label: 'Карточка книги', href: '/book/1' },
      ]}
    />
  );
}
