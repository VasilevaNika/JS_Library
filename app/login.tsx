import { StubScreen } from '@/components/StubScreen';

export default function LoginScreen() {
  return (
    <StubScreen
      title="S6 Вход / Регистрация"
      links={[
        { label: 'Забыли пароль?', href: '/reset-password' },
        { label: 'Войти как модератор', href: '/moderator/journal' },
      ]}
    />
  );
}
