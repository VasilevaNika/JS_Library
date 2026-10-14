import createQr from 'qrcode-generator';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius, shadows, space, typography } from '@/theme/tokens';

import { AppText } from './AppText';

/** Настоящий QR-код брони — его сканирует камера модератора. Код — ink на белом. */
export function QRCode({ value, size }: { value: string; size: number }) {
  const { path, count } = useMemo(() => {
    const qr = createQr(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    }
    return { path: d, count: n };
  }, [value]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`}>
      <Path d={path} fill={colors.ink} />
    </Svg>
  );
}

/** «7KQ4MX» → «7KQ 4MX». */
export function formatCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

function spelled(code: string) {
  return `Код брони ${code.split('').join(' ')}`;
}

/** QR-карточка: горизонтальная (подтверждение брони) или крупная по центру (детали брони). */
export function QRCard({ code, layout = 'row' }: { code: string; layout?: 'row' | 'center' }) {
  if (layout === 'center') {
    return (
      <View style={styles.center} accessibilityLabel="Код брони">
        <View style={[styles.frame, styles.frameLg]} accessibilityRole="image" accessibilityLabel="QR-код брони">
          <QRCode value={code} size={174} />
        </View>
        <Text style={styles.codeLg} accessibilityLabel={spelled(code)}>
          {formatCode(code)}
        </Text>
        <AppText variant="caption" tone="secondary" align="center">
          Покажите код на абонементе. Если камера не сработает, назовите его.
        </AppText>
      </View>
    );
  }
  return (
    <View style={styles.row} accessibilityLabel="Код брони">
      <View style={[styles.frame, styles.frameSm]} accessibilityRole="image" accessibilityLabel="QR-код брони">
        <QRCode value={code} size={94} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">Покажите код на абонементе</AppText>
        <AppText variant="caption" tone="secondary">
          Если камера не сработает, назовите код
        </AppText>
        <Text style={styles.code} accessibilityLabel={spelled(code)}>
          {formatCode(code)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    padding: space[3],
    borderRadius: radius['2xl'],
    backgroundColor: colors.surface,
    boxShadow: shadows.glass,
  },
  frame: { borderWidth: 1, borderColor: colors.line, flexShrink: 0 },
  frameSm: { width: 112, height: 112, padding: space[2], borderRadius: radius.icon },
  frameLg: { width: 200, height: 200, padding: space[3], borderRadius: radius.lg },
  rowText: { flex: 1, minWidth: 0, gap: space[1.5] },
  code: { ...typography.code, fontVariant: ['tabular-nums'], color: colors.ink },
  center: {
    alignItems: 'center',
    gap: space[3],
    padding: space[5],
    borderRadius: radius['2xl'],
    backgroundColor: colors.surface,
    boxShadow: shadows.glass,
  },
  codeLg: { ...typography.codeLg, fontVariant: ['tabular-nums'], color: colors.ink },
});
