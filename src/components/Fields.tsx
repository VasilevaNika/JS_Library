import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, iconSize, radius, shadows, size as sizes, space, status, typography, ui } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';

export type FieldState = 'default' | 'error' | 'warning';

type FieldProps = {
  label?: string;
  /** Серое уточнение после подписи: «Telegram · для напоминаний о сроке». */
  hint?: string;
  /** Ссылка справа от подписи («Забыли пароль?»). */
  labelAction?: ReactNode;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  /** Текст ошибки под полем; можно передать узел со ссылкой. */
  error?: ReactNode;
  state?: FieldState;
  /** Префикс «@» для Telegram. */
  prefix?: string;
  secure?: boolean;
  /** lg — мобильная таблетка 56 px, md — desktop 48 px. */
  size?: 'lg' | 'md';
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoFocus?: boolean;
  editable?: boolean;
  tabular?: boolean;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
};

const RING: Record<FieldState, string | undefined> = {
  default: undefined,
  error: shadows.ringError,
  warning: shadows.ringWarning,
};

/** Поле ввода: белая таблетка с подписью сверху. Фокус — кольцо 3 px accent, ошибка — 2 px overdue-dot. */
export function TextField({
  label,
  hint,
  labelAction,
  value,
  onChangeText,
  placeholder,
  error,
  state = error ? 'error' : 'default',
  prefix,
  secure,
  size = 'lg',
  multiline,
  keyboardType,
  autoComplete,
  autoCapitalize,
  autoFocus,
  editable = true,
  tabular,
  onBlur,
  onSubmitEditing,
  style,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const lg = size === 'lg';
  const ring = focused ? shadows.ringFocus : RING[state];
  return (
    <View style={[styles.field, style]}>
      {(label || labelAction) && (
        <View style={styles.labelRow}>
          {label ? (
            <Text style={[lg ? styles.labelLg : styles.labelMd]}>
              {label}
              {hint ? <Text style={styles.hint}> · {hint}</Text> : null}
            </Text>
          ) : (
            <View />
          )}
          {labelAction}
        </View>
      )}
      <View
        style={[
          lg ? styles.inputLg : styles.inputMd,
          multiline && styles.multiline,
          secure && styles.withButton,
          prefix !== undefined && styles.withPrefix,
          { boxShadow: ring },
        ]}
      >
        {prefix !== undefined && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkSubtle}
          secureTextEntry={secure && hidden}
          multiline={multiline}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize ?? (secure || keyboardType === 'email-address' ? 'none' : 'sentences')}
          autoFocus={autoFocus}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label}
          accessibilityState={{ disabled: !editable }}
          style={[
            styles.input,
            lg ? styles.inputTextLg : styles.inputTextMd,
            multiline && styles.inputMultiline,
            tabular && styles.tabular,
          ]}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel="Показать пароль"
            style={styles.eye}
          >
            <Icon name="eye" size={iconSize.button} />
          </Pressable>
        )}
      </View>
      {error ? (
        typeof error === 'string' ? (
          <AppText variant="caption" tone="overdue" style={styles.error} accessibilityRole="alert">
            {error}
          </AppText>
        ) : (
          <View style={styles.errorRow}>{error}</View>
        )
      ) : null}
    </View>
  );
}

/** Главный элемент первого экрана: стеклянная карточка с подписью, полем 56 px и иконкой поиска или «Очистить». */
export function SearchField({
  value,
  onChangeText,
  onSubmit,
  onClear,
  autoFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const canClear = !!onClear && value.length > 0;
  return (
    <View style={styles.searchCard}>
      <Text style={styles.searchLabel}>
        Название, автор <Text style={styles.searchLabelStrong}>или ISBN</Text>
      </Text>
      <View style={[styles.searchBox, focused && { boxShadow: shadows.ringFocus }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="Например, Кормен"
          placeholderTextColor={colors.inkSubtle}
          returnKeyType="search"
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel="Название, автор или ISBN"
          style={[styles.input, styles.searchInput]}
        />
        {canClear ? (
          <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Очистить запрос" style={styles.searchIcon}>
            <Icon name="closeSmall" size={iconSize.button} />
          </Pressable>
        ) : (
          <Pressable onPress={onSubmit} accessibilityRole="button" accessibilityLabel="Найти" style={styles.searchIcon}>
            <Icon name="search" size={iconSize.button} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Переключатель режима: «Вход | Регистрация», «Пропустить | Увеличить количество». */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'lg',
  stretch = true,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'lg' | 'sm';
  stretch?: boolean;
}) {
  const sm = size === 'sm';
  return (
    <View accessibilityRole="tablist" style={[styles.segment, !stretch && styles.segmentInline]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[
              styles.segmentItem,
              stretch && styles.segmentStretch,
              { height: sm ? 36 : sizes.controlMd, paddingHorizontal: sm ? 14 : space[4] },
              on && styles.segmentOn,
            ]}
          >
            <Text style={[sm ? styles.segmentTextSm : typography.buttonSm, { color: on || !sm ? colors.ink : status.neutral.fg }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Переключатель: включён — ink, выключен — #C9CDD3. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={[styles.switch, { backgroundColor: value ? colors.ink : ui.switchOff }]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

/** Чекбокс в строке-карточке. Слева — квадрат, дальше — произвольное содержимое. */
export function CheckboxRow({
  checked,
  onChange,
  children,
  accessibilityLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      style={styles.checkRow}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked && <Icon name="check" size={14} color={colors.onDark} strokeWidth={3} />}
      </View>
      {children}
    </Pressable>
  );
}

/** Счётчик экземпляров «− n +». */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 999,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.stepper} accessibilityRole="adjustable" accessibilityValue={{ now: value, min, max }}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Меньше"
        style={[styles.stepBtn, value <= min && styles.stepOff]}
      >
        <Text style={styles.stepSign}>−</Text>
      </Pressable>
      <AppText style={styles.stepValue} tabular>
        {value}
      </AppText>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Больше"
        style={[styles.stepBtn, value >= max && styles.stepOff]}
      >
        <Text style={styles.stepSign}>+</Text>
      </Pressable>
    </View>
  );
}

/** Таблетка с шевроном: выбранное поле каталога при сопоставлении колонок. */
export function Select({ label, onPress, muted }: { label: string; onPress?: () => void; muted?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.select, { backgroundColor: muted ? colors.surfaceSunken : ui.mappingBg }]}
    >
      <Text style={[typography.label, { color: muted ? colors.inkSecondary : colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
      <Icon name="chevronDown" size={iconSize.table} color={muted ? colors.inkSecondary : colors.ink} />
    </Pressable>
  );
}

/** Таблетка с датой «30.09.2026» — открывает выбор даты. */
export function DateButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Вернуть до ${label}`} style={styles.date}>
      <AppText variant="label" tabular>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space[2] },
  labelLg: { ...typography.caption, fontFamily: fonts.medium, color: colors.inkSecondary },
  labelMd: { ...typography.micro, color: colors.inkSecondary },
  hint: { fontFamily: fonts.regular },
  inputLg: {
    flexDirection: 'row',
    alignItems: 'center',
    height: sizes.controlLg,
    paddingHorizontal: space[5],
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  inputMd: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  multiline: {
    height: undefined,
    minHeight: 84,
    alignItems: 'flex-start',
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunken,
  },
  withButton: { paddingRight: space[2], gap: space[3] },
  withPrefix: { gap: 2 },
  prefix: { ...typography.headline, fontFamily: fonts.regular, color: colors.inkSecondary },
  // outlineWidth: 0 — у поля своё кольцо фокуса; убираем стандартную обводку браузера в web-превью.
  input: { flex: 1, minWidth: 0, height: '100%', padding: 0, color: colors.ink, outlineWidth: 0 },
  inputTextLg: { fontFamily: fonts.regular, fontSize: 17 },
  inputTextMd: { fontFamily: fonts.regular, fontSize: 15 },
  inputMultiline: { ...typography.label, fontFamily: fonts.regular, textAlignVertical: 'top' },
  tabular: { fontVariant: ['tabular-nums'] },
  eye: {
    width: sizes.controlMd,
    height: sizes.controlMd,
    borderRadius: sizes.controlMd / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  error: { paddingHorizontal: space[2] },
  errorRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2], paddingHorizontal: space[2] },

  searchCard: {
    gap: space[3],
    padding: space[4],
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.glass,
    borderRadius: radius['2xl'],
  },
  searchLabel: { ...typography.body, lineHeight: 20, color: colors.inkSecondary, paddingHorizontal: space[2] },
  searchLabelStrong: { color: colors.ink, fontFamily: fonts.medium },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: sizes.controlLg,
    paddingLeft: space[5],
    paddingRight: space[2],
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  searchInput: { fontFamily: fonts.regular, fontSize: 17 },
  searchIcon: {
    width: sizes.controlMd,
    height: sizes.controlMd,
    borderRadius: sizes.controlMd / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },

  segment: { flexDirection: 'row', gap: space[1], padding: space[1], borderRadius: radius.pill, backgroundColor: ui.track },
  segmentInline: { alignSelf: 'flex-start' },
  segmentItem: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segmentStretch: { flex: 1 },
  segmentOn: { backgroundColor: colors.surface, boxShadow: shadows.tabActive },
  segmentTextSm: { ...typography.caption, fontFamily: fonts.medium },

  switch: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface },
  knobOn: { alignSelf: 'flex-end' },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: 10,
    borderRadius: 16,
    backgroundColor: ui.selectedRowBg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.ink, borderColor: colors.ink },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: space[1],
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  stepOff: { opacity: 0.5 },
  stepSign: { fontFamily: fonts.regular, fontSize: 18, color: colors.ink },
  stepValue: { fontFamily: fonts.semibold, fontSize: 16 },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    paddingLeft: space[4],
    paddingRight: 14,
    borderRadius: radius.pill,
  },
  date: {
    width: 120,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
  },
});
