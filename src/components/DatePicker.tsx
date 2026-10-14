import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';

import { numericDate } from '@/lib/format';
import { colors, radius, shadows, space, ui } from '@/theme/tokens';

import { Button } from './Button';
import { DateButton } from './Fields';

/** Таблетка с датой «30.09.2026»: по нажатию — системный выбор даты (Android — диалог, iOS — календарь в окне). */
export function DateField({
  value,
  onChange,
  minimumDate,
}: {
  value: number;
  onChange: (t: number) => void;
  minimumDate?: number;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: new Date(value),
        mode: 'date',
        minimumDate: minimumDate ? new Date(minimumDate) : undefined,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(d.getTime());
        },
      });
    } else if (Platform.OS === 'ios') {
      setDraft(value);
      setIosOpen(true);
    }
  };

  return (
    <>
      <DateButton label={numericDate(value)} onPress={open} />
      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <View style={styles.backdrop}>
            <View style={styles.card}>
              <DateTimePicker
                value={new Date(draft)}
                mode="date"
                display="inline"
                locale="ru-RU"
                minimumDate={minimumDate ? new Date(minimumDate) : undefined}
                onChange={(_, d) => d && setDraft(d.getTime())}
              />
              <View style={styles.buttons}>
                <Button label="Отмена" variant="secondary" size="md" onPress={() => setIosOpen(false)} />
                <Button
                  label="Готово"
                  variant="dark"
                  size="md"
                  onPress={() => {
                    onChange(draft);
                    setIosOpen(false);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.overlay },
  card: {
    gap: space[3],
    padding: space[4],
    borderRadius: radius['2xl'],
    backgroundColor: colors.surface,
    boxShadow: shadows.dialog,
  },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] },
});
