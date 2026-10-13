import { StubScreen } from '@/components/StubScreen';

export default function ResetPasswordScreen() {
  return (
    <StubScreen
      title="S7 Сброс пароля"
      links={[
        { label: 'Вернуться ко входу', href: '/login' },
      ]}
    />
  );
}
