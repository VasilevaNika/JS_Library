// S6 · Вход и регистрация. Состояния: вход, вход для брони (bookId), неверный пароль, сессия истекла,
// регистрация (пустая / ошибки в полях / почта уже есть / заполнена).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText, AuthLayout, Button, Notice, SegmentedControl, TextField, TextLink } from '@/components';
import {
  createBooking,
  getBook,
  getDevFlag,
  isValidEmail,
  login,
  MIN_PASSWORD_LENGTH,
  register,
  setDevFlag,
  TEXT,
  type User,
} from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { useSession } from '@/hooks/useSession';
import { space } from '@/theme/tokens';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: Mode; bookId?: string; reason?: string; q?: string; email?: string }>();
  const { refresh } = useSession();
  const bookId = params.bookId ? Number(params.bookId) : null;

  const [mode, setMode] = useState<Mode>(params.mode === 'register' ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [telegram, setTelegram] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState(false);

  const ctx = useQuery(async () => {
    const [book, sessionFlag] = await Promise.all([bookId ? getBook(bookId) : Promise.resolve(null), getDevFlag('sessionExpired')]);
    return { book, session: params.reason === 'session' || sessionFlag };
  }, [bookId, params.reason]);

  const book = ctx.data?.book ?? null;
  const session = !!ctx.data?.session;
  const isContext = mode === 'login' && !!book;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/search'));

  const afterAuth = async (user: User) => {
    await refresh();
    if (session) await setDevFlag('sessionExpired', false);
    if (user.role === 'moderator') {
      router.dismissAll();
      router.replace('/moderator/journal');
      return;
    }
    if (bookId) {
      const res = await createBooking(user.id, bookId);
      if (res.ok) {
        router.replace(`/booking-confirmed/${res.bookingId}`);
        return;
      }
    }
    close();
  };

  const submitLogin = async () => {
    setBusy(true);
    try {
      const res = await login(email, password);
      if (!res.ok) {
        setLoginError(true);
        return;
      }
      setLoginError(false);
      await afterAuth(res.user);
    } finally {
      setBusy(false);
    }
  };

  const emailInvalid = touched.email && email.length > 0 && !isValidEmail(email);
  const passwordShort = touched.password && password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const canRegister =
    name.trim().length > 0 && isValidEmail(email) && password.length >= MIN_PASSWORD_LENGTH && !emailTaken;

  const submitRegister = async () => {
    setBusy(true);
    try {
      const res = await register({ fullName: name, email, telegram, password });
      if (!res.ok) {
        setEmailTaken(res.errors.includes('emailTaken'));
        setTouched({ email: true, password: true });
        return;
      }
      await afterAuth(res.user);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setPassword('');
    setTouched({});
    setLoginError(false);
    setEmailTaken(false);
  };

  if (mode === 'register') {
    return (
      <AuthLayout
        title="Регистрация"
        muted="читателя"
        subtitle="Почта и Telegram — для напоминаний о сроке."
        onClose={close}
        form={
          <>
            <SegmentedControl
              options={[{ value: 'login', label: 'Вход' }, { value: 'register', label: 'Регистрация' }]}
              value={mode}
              onChange={switchMode}
            />
            <TextField label="Имя и фамилия" value={name} onChangeText={setName} placeholder="Анна Смирнова" autoComplete="name" autoCapitalize="words" />
            <TextField
              label="Почта"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setEmailTaken(false);
              }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="name@mail.ru"
              keyboardType="email-address"
              autoComplete="email"
              state={emailInvalid || emailTaken ? 'error' : 'default'}
              error={
                emailInvalid ? (
                  TEXT.emailInvalid
                ) : emailTaken ? (
                  <>
                    <AppText variant="caption" tone="overdue">
                      {TEXT.emailTaken}
                    </AppText>
                    <TextLink label="Войти с ним" onPress={() => switchMode('login')} />
                  </>
                ) : undefined
              }
            />
            <TextField
              label="Telegram"
              hint="для напоминаний о сроке"
              prefix="@"
              value={telegram}
              onChangeText={setTelegram}
              placeholder="username"
              autoCapitalize="none"
            />
            <TextField
              label="Пароль"
              value={password}
              onChangeText={setPassword}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder={`Не короче ${MIN_PASSWORD_LENGTH} символов`}
              secure
              autoComplete="new-password"
              error={passwordShort ? TEXT.passwordShort : undefined}
            />
          </>
        }
        footer={
          <Button
            label="Создать аккаунт"
            variant="dark"
            block
            disabled={!canRegister}
            loading={busy}
            onPress={() => void submitRegister()}
          />
        }
      />
    );
  }

  return (
    <AuthLayout
      title="Вход"
      muted="в библиотеку"
      subtitle={
        isContext
          ? 'Без входа бронь не оформить — так модератор узнает, кому выдать книгу.'
          : session
            ? 'Войдите, чтобы продолжить с того же места.'
            : 'Войдите, чтобы бронировать книги и следить за сроками.'
      }
      onClose={close}
      notices={
        <>
          {isContext && book && (
            <Notice
              tone="neutral"
              cover={book.coverColor}
              text={`Чтобы забронировать «${book.title}», войдите. Бронь оформится сразу.`}
            />
          )}
          {session && (
            <Notice
              tone="busy"
              text={
                params.q
                  ? `Сессия истекла, войдите снова. Запрос «${params.q}» и открытая карточка сохранены.`
                  : 'Сессия истекла, войдите снова.'
              }
            />
          )}
        </>
      }
      form={
        <>
          <SegmentedControl
            options={[{ value: 'login', label: 'Вход' }, { value: 'register', label: 'Регистрация' }]}
            value={mode}
            onChange={switchMode}
          />
          <TextField
            label="Почта"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setLoginError(false);
            }}
            placeholder="name@mail.ru"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextField
            label="Пароль"
            labelAction={
              <TextLink
                label="Забыли пароль?"
                onPress={() => router.push({ pathname: '/reset-password', params: email ? { email } : {} })}
              />
            }
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setLoginError(false);
            }}
            placeholder={`Не короче ${MIN_PASSWORD_LENGTH} символов`}
            secure
            autoComplete="password"
            onSubmitEditing={() => void submitLogin()}
            error={loginError ? TEXT.loginInvalid : undefined}
          />
        </>
      }
      footer={
        <>
          <Button
            label={isContext ? 'Войти и забронировать' : 'Войти'}
            variant="dark"
            block
            loading={busy}
            onPress={() => void submitLogin()}
          />
          {!isContext && !session && (
            <AppText variant="caption" tone="secondary" align="center" style={styles.note}>
              Модераторы входят здесь же — после входа откроется журнал.
            </AppText>
          )}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  note: { paddingHorizontal: space[4] },
});
