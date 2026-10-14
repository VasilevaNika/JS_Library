// S7 · Сброс пароля. Состояния: форма, «Проверьте почту» (с таймером повторной отправки).
// Писем приложение не отправляет (Q2) — экран показывает подтверждение как есть.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthLayout, Button, StatusIcon, TextField } from '@/components';
import { requestPasswordReset } from '@/db';
import { colors, fonts, space, typography } from '@/theme/tokens';

const RESEND_SECONDS = 45;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [invalid, setInvalid] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [left, setLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (!sentTo || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sentTo, left]);

  const toLogin = () =>
    router.canGoBack() ? router.back() : router.replace({ pathname: '/login', params: email ? { email } : {} });

  const send = () => {
    if (!requestPasswordReset(email).ok) {
      setInvalid(true);
      return;
    }
    setSentTo(email.trim());
    setLeft(RESEND_SECONDS);
  };

  if (sentTo) {
    const mm = Math.floor(left / 60);
    const ss = String(left % 60).padStart(2, '0');
    return (
      <AuthLayout
        title="Проверьте"
        muted="почту"
        subtitle="Откройте письмо и перейдите по ссылке. Если письма нет, загляните в «Спам»."
        onClose={toLogin}
        form={
          <View style={styles.sent}>
            <StatusIcon icon="mail" tone="available" size={52} />
            <Text style={styles.sentText}>
              Ссылка для сброса отправлена на <Text style={styles.strong}>{sentTo}</Text>
            </Text>
          </View>
        }
        footer={
          <>
            <Button
              label={left > 0 ? `Отправить ещё раз через ${mm}:${ss}` : 'Отправить ещё раз'}
              variant="dark"
              block
              disabled={left > 0}
              onPress={send}
            />
            <Button label="Вернуться ко входу" variant="secondary" block onPress={toLogin} />
          </>
        }
      />
    );
  }

  return (
    <AuthLayout
      title="Сброс"
      muted="пароля"
      subtitle="Пришлём на почту ссылку, по которой можно задать новый пароль."
      onClose={toLogin}
      form={
        <TextField
          label="Почта"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setInvalid(false);
          }}
          placeholder="name@mail.ru"
          keyboardType="email-address"
          autoComplete="email"
          onSubmitEditing={send}
          error={invalid ? 'Проверьте адрес — в нём нет @' : undefined}
        />
      }
      footer={
        <>
          <Button label="Отправить ссылку" variant="dark" block onPress={send} />
          <Button label="Вернуться ко входу" variant="secondary" block onPress={toLogin} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  sent: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[1] },
  sentText: { ...typography.body, flex: 1, color: colors.ink },
  strong: { fontFamily: fonts.semibold },
});
