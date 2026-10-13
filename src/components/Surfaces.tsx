import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { backgrounds, colors, gradients, radius, shadows } from '@/theme/tokens';

type BoxProps = { children?: ReactNode; style?: StyleProp<ViewStyle> };

/** Стеклянная карточка: glass + glass-edge + shadow-glass, радиус 2xl. */
export function Glass({ children, style }: BoxProps) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

/** Белая карточка, радиус lg. */
export function Surface({ children, style }: BoxProps) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export type BackgroundVariant = 'search' | 'login' | 'bookings' | 'book' | 'desktop';

/** Фон экрана: градиент ground 170° + цветные пятна сверху (у каждого раздела своя раскладка). */
export function ScreenBackground({ variant = 'search', children, style }: BoxProps & { variant?: BackgroundVariant }) {
  if (variant === 'desktop') {
    return <View style={[styles.fill, { experimental_backgroundImage: backgrounds.desktop }, style]}>{children}</View>;
  }
  const aura = backgrounds[variant];
  return (
    <View style={[styles.fill, styles.ground, style]}>
      <View
        pointerEvents="none"
        style={[styles.aura, { height: aura.height, experimental_backgroundImage: aura.image }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: shadows.glass,
    borderRadius: radius['2xl'],
  },
  surface: { backgroundColor: colors.surface, borderRadius: radius.lg },
  fill: { flex: 1, backgroundColor: colors.groundMid },
  ground: { experimental_backgroundImage: gradients.ground },
  aura: { position: 'absolute', top: 0, left: 0, right: 0 },
});
