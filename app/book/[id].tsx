import { StubScreen } from '@/components/StubScreen';

export default function BookScreen() {
  return (
    <StubScreen
      title="S4 Карточка книги"
      links={[
        { label: 'Бронь оформлена', href: '/booking-confirmed/1' },
        { label: 'Войти и забронировать', href: { pathname: '/login', params: { bookId: '1' } } },
      ]}
    />
  );
}
