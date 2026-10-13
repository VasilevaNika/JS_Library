import { StubScreen } from '@/components/StubScreen';

export default function MenuScreen() {
  return (
    <StubScreen
      title="S3 Меню"
      links={[
        { label: 'Поиск книг', href: '/search' },
        { label: 'Мои брони', href: '/bookings' },
        { label: 'Профиль', href: '/profile' },
      ]}
    />
  );
}
