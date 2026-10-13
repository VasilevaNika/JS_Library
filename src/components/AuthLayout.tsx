import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space } from '@/theme/tokens';

import { AppText, TwoToneTitle } from './AppText';
import { Header } from './Navigation';
import { Glass, ScreenBackground } from './Surfaces';

/** Общая раскладка входа, регистрации и сброса пароля: шапка с «×», заголовок, плашки, стеклянная форма, кнопки. */
export function AuthLayout({
  title,
  muted,
  subtitle,
  onClose,
  closeLabel = 'Закрыть',
  notices,
  form,
  footer,
}: {
  title: string;
  muted: string;
  subtitle: string;
  onClose: () => void;
  closeLabel?: string;
  notices?: ReactNode;
  form: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <ScreenBackground variant="login">
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Header variant="brand" action={{ icon: 'close', label: closeLabel, onPress: onClose }} />
            <View style={styles.titleBlock}>
              <TwoToneTitle text={title} muted={muted} />
              <AppText tone="secondary">{subtitle}</AppText>
            </View>
            {notices}
            <Glass style={styles.form}>{form}</Glass>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: space[4], paddingHorizontal: space[4], paddingBottom: space[6], gap: space[4] },
  titleBlock: { gap: space[2], paddingTop: space[1], paddingHorizontal: space[2] },
  form: { gap: space[4], padding: space[4] },
  footer: { gap: space[3] },
});
