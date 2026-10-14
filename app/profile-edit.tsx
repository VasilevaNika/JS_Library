// S11 · Редактирование профиля. Состояние одно; ошибки почты — при сохранении.
// «Сменить фото» и «Сменить пароль» неактивны: экранов для них в макетах нет (Q8).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Avatar,
  Button,
  Glass,
  Header,
  Icon,
  ScreenBackground,
  TextField,
} from '@/components';
import { initials, setAvatar, updateProfile, type ProfileError } from '@/db';
import { useSession } from '@/hooks/useSession';
import { dayMonth } from '@/lib/format';
import { colors, fonts, space, status, typography } from '@/theme/tokens';

const ERROR_TEXT: Record<ProfileError, string> = {
  emailInvalid: 'Проверьте адрес — в нём нет @',
  emailTaken: 'Этот адрес уже зарегистрирован.',
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refresh } = useSession();
  const [name, setName] = useState(user?.fullName ?? '');
  const [group, setGroup] = useState(user?.groupName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [telegram, setTelegram] = useState(user?.telegram ?? '');
  const [error, setError] = useState<ProfileError | null>(null);
  const [busy, setBusy] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/profile'));

  if (!user) {
    return (
      <ScreenBackground variant="profile">
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>
            <Header variant="back" title="Редактирование" backLabel="Назад в профиль" onBack={back} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const save = async () => {
    setBusy(true);
    try {
      const res = await updateProfile(user.id, { fullName: name, groupName: group, email, telegram });
      if (!res.ok) {
        setError(res.errors[0]);
        return;
      }
      await refresh();
      back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground variant="profile">
      <SafeAreaView edges={['top']} style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Header variant="back" title="Редактирование" backLabel="Назад в профиль" onBack={back} />
            </View>
            <View style={styles.main}>
              <Glass style={styles.photo}>
                <Avatar initials={initials(user.fullName)} color={user.avatarColor} size={80}>
                  <View style={styles.camera}>
                    <Icon name="camera" size={14} color={colors.onDark} />
                  </View>
                </Avatar>
                <View style={styles.photoActions}>
                  <Button label="Сменить фото" variant="tertiary" size="md" disabled />
                  <Text
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !user.avatarUri }}
                    onPress={user.avatarUri ? () => void setAvatar(user.id, null).then(refresh) : undefined}
                    style={[styles.remove, !user.avatarUri && styles.removeOff]}
                  >
                    Удалить фото
                  </Text>
                </View>
              </Glass>

              <Glass style={styles.form}>
                <TextField label="Имя и фамилия" value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" />
                <TextField label="Учебная группа" value={group} onChangeText={setGroup} autoCapitalize="characters" />
                <TextField
                  label="Почта"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setError(null);
                  }}
                  keyboardType="email-address"
                  autoComplete="email"
                  error={error ? ERROR_TEXT[error] : undefined}
                />
                <TextField
                  label="Telegram"
                  hint="для напоминаний о сроке"
                  prefix="@"
                  value={telegram}
                  onChangeText={setTelegram}
                  autoCapitalize="none"
                />
                <View style={styles.password}>
                  <View style={styles.passwordText}>
                    <AppText variant="label">Пароль</AppText>
                    <AppText variant="caption" tone="secondary">
                      Изменён {dayMonth(user.passwordChangedAt)}
                    </AppText>
                  </View>
                  <Button label="Сменить пароль" variant="tertiary" size="md" disabled />
                </View>
              </Glass>
            </View>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: space[8] + insets.bottom }]}>
            <Button label="Отмена" variant="secondary" onPress={back} style={styles.flex} />
            <Button label="Сохранить" variant="dark" loading={busy} onPress={() => void save()} style={styles.flex14} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex14: { flex: 1.4 },
  scroll: { flexGrow: 1 },
  header: { padding: space[4] },
  main: { gap: space[4], paddingHorizontal: space[4] },
  photo: { flexDirection: 'row', alignItems: 'center', gap: space[4], padding: space[4] },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: colors.groundMid,
  },
  photoActions: { gap: space[2], alignItems: 'flex-start' },
  remove: { ...typography.caption, fontFamily: fonts.medium, color: status.overdue.fg, paddingHorizontal: space[4], paddingVertical: 7 },
  removeOff: { opacity: 0.5 },
  form: { gap: space[4], padding: space[4] },
  password: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingTop: space[1],
    paddingRight: space[1],
    paddingLeft: space[2],
  },
  passwordText: { gap: 2 },
  footer: { flexDirection: 'row', gap: space[2], paddingTop: space[4], paddingHorizontal: space[4] },
});
