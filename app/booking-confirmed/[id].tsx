import { StubScreen } from '@/components/StubScreen';

export default function BookingConfirmedScreen() {
  return (
    <StubScreen
      title="S5 Бронь оформлена"
      links={[
        { label: 'Мои брони', href: '/bookings' },
        { label: 'Найти ещё', href: '/search' },
      ]}
    />
  );
}
