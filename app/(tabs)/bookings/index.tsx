import { StubScreen } from '@/components/StubScreen';

export default function MyBookingsScreen() {
  return (
    <StubScreen
      title="S8 Мои брони"
      links={[
        { label: 'Бронь', href: '/booking/1' },
        { label: 'Войти', href: '/login' },
      ]}
    />
  );
}
