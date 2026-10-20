import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { backgrounds, colors, gradients, radius, shadows, size } from '@/theme/tokens';

type BoxProps = { children?: ReactNode; style?: StyleProp<ViewStyle> };

/** Стеклянная карточка: glass + glass-edge + shadow-glass, радиус 2xl. */
export function Glass({ children, style }: BoxProps) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

/** Белая карточка, радиус lg. */
export function Surface({ children, style }: BoxProps) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export type BackgroundVariant = 'search' | 'login' | 'bookings' | 'book' | 'details' | 'profile' | 'success' | 'desktop';

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

/**
 * Браузер: экраны студента нарисованы под телефон, поэтому на широком окне они идут колонкой
 * шириной size.phoneWidth по центру. На iOS и Android и при enabled=false — просто flex: 1.
 * pointerEvents="box-none": нажатия мимо содержимого проходят дальше (например, на затемнение под шторкой).
 */
export function PhoneColumn({ children, enabled = true }: { children?: ReactNode; enabled?: boolean }) {
  return (
    <View pointerEvents="box-none" style={[styles.flex, Platform.OS === 'web' && enabled && styles.phoneColumn]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  phoneColumn: { width: '100%', maxWidth: size.phoneWidth, alignSelf: 'center' },
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
