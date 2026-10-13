// Дизайн-токены. Источник — :root в design/system/campus-library-design-system.html.
// Все цвета, шрифты, отступы, радиусы и тени приложения берутся только отсюда.

export const colors = {
  groundTop: '#E4E6EA',
  groundMid: '#F2F3F5',
  groundBottom: '#E8EAED',

  glass: 'rgba(255,255,255,0.62)',
  glassStrong: 'rgba(255,255,255,0.72)',
  glassEdge: 'rgba(255,255,255,0.95)',

  surface: '#FFFFFF',
  surfaceSunken: '#F1F2F4',

  line: '#E3E5E8',
  lineStrong: '#D7DADF',
  divider: '#EEF0F2',

  ink: '#16181D',
  inkSecondary: '#5B616B',
  inkMuted: '#6B717B',
  inkSubtle: '#7C828C',
  onDark: '#FFFFFF',

  accent: '#2B47C9',
  onAccent: '#FFFFFF',

  brandTeal: '#1F5E6B',
  brandBlue: '#3E6FD8',

  auraViolet: 'rgba(110,134,242,0.42)',
  auraPeach: 'rgba(255,170,130,0.45)',
  auraMint: 'rgba(110,200,165,0.32)',

  scanGround: '#1B1E24',
  scanLine: '#57C08A',
} as const;

export type StatusTone = 'available' | 'busy' | 'overdue' | 'neutral';

export const status: Record<StatusTone, { bg: string; fg: string; dot: string }> = {
  available: { bg: '#DDF0E4', fg: '#17663F', dot: '#2E9B5F' },
  busy: { bg: '#FAEBCB', fg: '#7A4D00', dot: '#D08A0B' },
  overdue: { bg: '#FBE1DD', fg: '#A1241B', dot: '#D43B2F' },
  neutral: { bg: '#EDEEF0', fg: '#4A505A', dot: '#8A9099' },
};

export type CoverColor =
  | 'teal'
  | 'terracotta'
  | 'mustard'
  | 'violet'
  | 'graphite'
  | 'green'
  | 'rose'
  | 'sky'
  | 'ochre';

/** Пары градиента обложек-заглушек, угол 160°. */
export const covers: Record<CoverColor, { from: string; to: string }> = {
  teal: { from: '#1F5E6B', to: '#4FA3A5' },
  terracotta: { from: '#B5462E', to: '#EE9B6A' },
  mustard: { from: '#E0A33A', to: '#F6DC8C' },
  violet: { from: '#4B347D', to: '#9C7BD3' },
  graphite: { from: '#262B35', to: '#5E6A7D' },
  green: { from: '#3E7D4F', to: '#8CC49A' },
  rose: { from: '#A33A5B', to: '#E28AA5' },
  sky: { from: '#2F6FA8', to: '#7DB5E0' },
  ochre: { from: '#8A6A3E', to: '#D2B07A' },
};

export const coverGradientAngle = 160;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

export const radius = {
  coverSpine: 3,
  cover: 7,
  sm: 8,
  md: 12,
  icon: 18,
  lg: 20,
  xl: 24,
  '2xl': 28,
  sheet: 32,
  pill: 999,
} as const;

/** Тени в CSS-синтаксисе — React Native 0.76+ понимает их в стиле `boxShadow`. */
export const shadows = {
  glass: '0 1px 2px rgba(22,24,29,0.04), 0 12px 32px rgba(22,24,29,0.06)',
  floating: '0 1px 2px rgba(22,24,29,0.04), 0 12px 32px rgba(22,24,29,0.12)',
  tabActive: '0 2px 8px rgba(22,24,29,0.08)',
  accent: '0 8px 20px rgba(43,71,201,0.25)',
  coverSm: 'inset 3px 0 0 rgba(0,0,0,0.18), 0 4px 10px rgba(22,24,29,0.16)',
  coverLg: 'inset 6px 0 0 rgba(0,0,0,0.2), 0 20px 40px rgba(22,24,29,0.22), 0 2px 6px rgba(22,24,29,0.1)',
  dialog: '0 20px 48px rgba(22,24,29,0.25)',
} as const;

/** Высоты элементов. */
export const size = {
  controlLg: 56,
  controlMd: 44,
  controlSm: 32,
  iconButton: 52,
  chipLg: 36,
  chipMd: 30,
  chipSm: 26,
  tabBar: 72,
} as const;

/** Размеры иконок: таблица и тулбар, кнопки и InfoRow, иконки-кнопки, таб-бар. */
export const iconSize = {
  table: 18,
  button: 20,
  iconButton: 22,
  tabBar: 24,
} as const;

export const blur = {
  glass: 16,
} as const;

/** Golos Text 400 / 500 / 600 — имена, под которыми шрифты загружаются в app/_layout.tsx. */
export const fonts = {
  regular: 'GolosText_400Regular',
  medium: 'GolosText_500Medium',
  semibold: 'GolosText_600SemiBold',
} as const;

type TextStyleToken = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
};

/** letterSpacing в em из макета переведён в пиксели: em × fontSize. */
export const typography = {
  display: { fontFamily: fonts.semibold, fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  titleLg: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.56 },
  title: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  buttonSm: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
} satisfies Record<string, TextStyleToken>;

/** Фон экрана: градиент 170° и цветные ауры сверху. */
export const gradients = {
  ground: `linear-gradient(170deg, ${colors.groundTop} 0%, ${colors.groundMid} 40%, ${colors.groundBottom} 100%)`,
  auraViolet: `radial-gradient(110% 75% at 5% 0%, ${colors.auraViolet} 0%, rgba(110,134,242,0) 58%)`,
  auraPeach: `radial-gradient(85% 65% at 100% 8%, ${colors.auraPeach} 0%, rgba(255,170,130,0) 58%)`,
  auraMint: `radial-gradient(80% 55% at 55% 85%, ${colors.auraMint} 0%, rgba(110,200,165,0) 62%)`,
} as const;

export const tokens = {
  colors,
  status,
  covers,
  space,
  radius,
  shadows,
  size,
  iconSize,
  blur,
  fonts,
  typography,
  gradients,
} as const;
