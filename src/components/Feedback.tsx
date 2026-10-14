import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  fonts,
  iconSize,
  radius,
  shadows,
  space,
  status,
  typography,
  ui,
  type CoverColor,
  type StatusTone,
} from '@/theme/tokens';

import { AppText } from './AppText';
import { BookCover } from './BookCover';
import { Button } from './Button';
import { Icon } from './Icon';

type NoticeProps = {
  tone: StatusTone;
  text: string;
  /** Ссылка на следующий шаг под текстом («Открыть «Мои брони»»). */
  link?: { label: string; onPress: () => void };
  /** Кнопка справа («Открыть её») или снизу («Выдать без брони») — белая. */
  action?: { label: string; onPress: () => void; placement?: 'right' | 'below' };
  /** Обложка слева — для «Чтобы забронировать …, войдите». Плашка тогда полупрозрачная белая. */
  cover?: CoverColor;
  /** Крупная плашка desktop: радиус 24, текст 14 px. */
  large?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Плашка-пояснение на экране: факт и, если нужно, ссылка на следующий шаг. Тон — как у статусов. */
export function Notice({ tone, text, link, action, cover, large, style }: NoticeProps) {
  const t = status[tone];
  const right = action && action.placement !== 'below';
  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        { backgroundColor: cover ? ui.chipLgBg : t.bg },
        cover && styles.noticeCover,
        right && styles.noticeRight,
        large && styles.noticeLarge,
        style,
      ]}
    >
      {cover && <BookCover color={cover} width={32} height={46} lines={1} />}
      <View style={[styles.noticeBody, (cover || right) && styles.flex]}>
        <Text style={[large ? styles.noticeTextLg : styles.noticeText, { color: cover ? colors.ink : t.fg }]}>{text}</Text>
        {link && (
          <Text onPress={link.onPress} accessibilityRole="link" style={styles.noticeLink}>
            {link.label}
          </Text>
        )}
        {action && !right && (
          <Button label={action.label} onPress={action.onPress} variant="light" size="md" />
        )}
      </View>
      {right && <Button label={action.label} onPress={action.onPress} variant="light" size="sm" />}
    </View>
  );
}

/** Баннер — состояние экрана: «Нет подключения. Показаны данные на 18:40» + «Повторить». */
export function Banner({ text, actionLabel, onAction }: { text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Icon name="wifiOff" size={iconSize.button} color={status.busy.fg} />
      <Text style={[styles.noticeText, styles.flex, { color: status.busy.fg }]}>{text}</Text>
      {actionLabel && <Button label={actionLabel} onPress={onAction} variant="light" size="sm" />}
    </View>
  );
}

/** Тост — итог действия: тёмный, с одним действием. `inline` — встроенный в панель (desktop, с галочкой). */
export function Toast({
  text,
  actionLabel,
  onAction,
  success,
  inline,
  bottom = 96,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  success?: boolean;
  inline?: boolean;
  bottom?: number;
}) {
  return (
    <View
      accessibilityRole={success ? 'text' : 'alert'}
      accessibilityLiveRegion="polite"
      style={[styles.toast, inline ? styles.toastInline : [styles.toastFloating, { bottom }]]}
    >
      {success && (
        <View style={styles.toastCheck}>
          <Icon name="check" size={16} color={colors.onDark} />
        </View>
      )}
      <Text style={[typography.caption, styles.flex, { color: colors.onDark }]}>{text}</Text>
      {actionLabel && <Button label={actionLabel} onPress={onAction} variant="light" size="sm" height={36} strong />}
    </View>
  );
}

function Backdrop({ onPress, strong }: { onPress?: () => void; strong?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? 'Закрыть' : undefined}
      style={StyleSheet.absoluteFill}
    >
      <BlurView intensity={strong ? 18 : 12} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: strong ? ui.overlayStrong : ui.overlay }]} />
    </Pressable>
  );
}

type DialogProps = {
  visible: boolean;
  title: ReactNode;
  text?: string;
  /** Поле или другое содержимое между текстом и кнопками. */
  children?: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** desktop: ширина 480, кнопки md справа. */
  desktop?: boolean;
};

/** Подтверждение необратимого действия: вопрос, последствия, «Оставить» слева и деструктивная кнопка справа. */
export function Dialog({ visible, title, text, children, cancelLabel, confirmLabel, onCancel, onConfirm, desktop }: DialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Backdrop />
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={[styles.dialog, desktop && styles.dialogDesktop]}
        >
          {typeof title === 'string' ? <AppText variant="title">{title}</AppText> : title}
          {text ? (
            <AppText variant={desktop ? 'label' : 'body'} tone={desktop ? 'neutral' : 'secondary'} style={desktop && styles.regular}>
              {text}
            </AppText>
          ) : null}
          {children}
          <View style={[styles.dialogButtons, desktop && styles.dialogButtonsDesktop]}>
            <Button
              label={cancelLabel}
              onPress={onCancel}
              variant="secondary"
              size={desktop ? 'md' : 'lg'}
              style={!desktop && styles.flex}
            />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant="danger"
              size={desktop ? 'md' : 'lg'}
              strong
              style={!desktop && styles.flex}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Шторка: результат действия или подтверждение без потери контекста. Ручка сверху, тап по затемнению закрывает. */
export function BottomSheet({
  visible,
  onClose,
  children,
  strongBackdrop,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  strongBackdrop?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Backdrop onPress={onClose} strong={strongBackdrop} />
        <View accessibilityViewIsModal style={[styles.sheet, { bottom: space[2] + insets.bottom }]}>
          <View style={styles.handle} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  regular: { fontFamily: fonts.regular },
  notice: { gap: space[1.5], paddingVertical: space[3], paddingHorizontal: space[4], borderRadius: radius.lg },
  noticeCover: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[2.5],
    paddingLeft: space[2.5],
    paddingRight: space[3.5],
    borderWidth: 1,
    borderColor: colors.glassEdge,
  },
  noticeRight: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingRight: space[3] },
  noticeLarge: { gap: space[2.5], paddingVertical: space[3.5], borderRadius: radius.xl },
  noticeBody: { gap: space[1.5] },
  noticeText: { ...typography.caption, fontFamily: fonts.medium },
  noticeTextLg: { ...typography.label },
  noticeLink: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    color: colors.ink,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[2.5],
    paddingLeft: space[4],
    paddingRight: space[2.5],
    borderRadius: radius.lg,
    backgroundColor: status.busy.bg,
  },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderRadius: radius.lg, backgroundColor: colors.ink },
  toastFloating: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    paddingVertical: space[3],
    paddingLeft: space[4],
    paddingRight: space[3],
    boxShadow: shadows.toast,
  },
  toastInline: { paddingVertical: space[3.5], paddingHorizontal: space[4] },
  toastCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: status.available.dot,
  },
  modalRoot: { flex: 1, justifyContent: 'center' },
  dialog: {
    marginHorizontal: space[6],
    gap: space[3],
    paddingTop: space[6],
    paddingHorizontal: space[5],
    paddingBottom: space[5],
    borderRadius: radius['2xl'],
    backgroundColor: colors.surface,
    boxShadow: shadows.dialog,
  },
  dialogDesktop: {
    alignSelf: 'center',
    width: 480,
    maxWidth: '90%',
    marginHorizontal: 0,
    gap: space[3.5],
    padding: space[6],
    boxShadow: shadows.dialogDesktop,
  },
  dialogButtons: { flexDirection: 'row', gap: space[2], paddingTop: space[2] },
  dialogButtonsDesktop: { justifyContent: 'flex-end', paddingTop: space[1] },
  sheet: {
    position: 'absolute',
    left: space[2],
    right: space[2],
    gap: space[4],
    paddingTop: space[3],
    paddingHorizontal: space[5],
    paddingBottom: space[5],
    borderRadius: radius.sheet,
    backgroundColor: ui.sheet,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.sheet,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: ui.sheetHandle },
});
