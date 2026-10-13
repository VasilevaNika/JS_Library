import { StyleSheet, View } from 'react-native';

import { backgrounds, colors, radius, ui } from '@/theme/tokens';

import { Icon } from './Icon';

/** Временный знак: круг brand-teal → brand-blue с иконкой открытой книги (слой Logo_Header). */
export function Logo({ size = 44, square = false }: { size?: number; square?: boolean }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Логотип библиотеки"
      style={[styles.logo, { width: size, height: size, borderRadius: square ? radius.icon : size / 2 }]}
    >
      <Icon name="bookOpen" size={Math.round(size / 2)} color={colors.onDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandTeal,
    experimental_backgroundImage: backgrounds.logo,
    boxShadow: ui.logoHighlight,
  },
});
