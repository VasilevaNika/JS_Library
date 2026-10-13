import { StubScreen } from '@/components/StubScreen';

export default function BookingScreen() {
  return (
    <StubScreen
      title="S9 Бронь"
      links={[
        { label: 'Карточка книги', href: '/book/1' },
      ]}
    />
  );
}
