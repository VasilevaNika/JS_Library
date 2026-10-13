import { StubScreen } from '@/components/StubScreen';

export default function ProfileScreen() {
  return (
    <StubScreen
      title="S10 Профиль"
      links={[
        { label: 'Редактирование', href: '/profile-edit' },
      ]}
    />
  );
}
