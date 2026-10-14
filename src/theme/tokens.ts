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

/**
 * Значения, которые в экспорте экранов заданы инлайном, а не переменными :root.
 * Собраны здесь, чтобы в компонентах не было хардкода.
 */
export const ui = {
  transparent: 'transparent',
  overlay: 'rgba(22,24,29,0.36)',
  overlayStrong: 'rgba(22,24,29,0.4)',
  overlayMenu: 'rgba(22,24,29,0.32)',
  sheet: 'rgba(246,247,249,0.96)',
  menuPanel: 'rgba(246,247,249,0.92)',
  sheetHandle: '#C9CDD3',
  chipLgBg: 'rgba(255,255,255,0.7)',
  track: 'rgba(22,24,29,0.06)',
  progressTrack: 'rgba(22,24,29,0.08)',
  panelDivider: 'rgba(22,24,29,0.07)',
  disabledBg: '#E3E5E8',
  disabledFg: '#5B616B',
  dangerDisabledBg: '#F4E9E7',
  dangerDisabledFg: '#B9837C',
  switchOff: '#C9CDD3',
  statDiscTo: '#E3E6EA',
  highlightRowBg: '#FFF8EA',
  selectedRowBg: '#F4F5F7',
  errorRowBg: '#FFF7F6',
  mappingBg: '#EEF2FF',
  dropzoneBorder: '#B9BEC6',
  scanCenter: '#3B4250',
  scanFrame: '#FFFFFF',
  scanCaption: 'rgba(255,255,255,0.8)',
  scanGlow: 'rgba(87,192,138,0.6)',
  onDarkTrack: 'rgba(255,255,255,0.18)',
  countOnTone: 'rgba(255,255,255,0.6)',
  countOnNeutral: 'rgba(255,255,255,0.7)',
  coverLine: 'rgba(255,255,255,0.8)',
  coverLine2: 'rgba(255,255,255,0.5)',
  coverLineDark: 'rgba(22,24,29,0.55)',
  coverLineGraphite: 'rgba(230,200,140,0.9)',
  coverRing: 'rgba(255,255,255,0.12)',
  logoHighlight: 'inset 0 1px 0 rgba(255,255,255,0.3)',
  skeleton: '#E3E5E8',
  skeletonTo: '#EEF0F2',
  skeletonGlass: 'rgba(255,255,255,0.5)',
  skeletonStat: 'rgba(255,255,255,0.55)',
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

/** Шкала отступов дизайн-системы (4–32) и промежуточные значения из экспорта экранов (2, 6, 10, 14, 18). */
export const space = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  4.5: 18,
  5: 20,
  6: 24,
  8: 32,
} as const;

export const radius = {
  coverSpine: 3,
  cover: 7,
  sm: 8,
  corner: 10,
  md: 12,
  control: 16,
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
  dialogDesktop: '0 24px 64px rgba(22,24,29,0.3)',
  sheet: '0 -12px 40px rgba(22,24,29,0.2)',
  bookPanel: '0 -12px 32px rgba(22,24,29,0.06)',
  toast: '0 12px 32px rgba(22,24,29,0.3)',
  menu: '-12px 0 40px rgba(22,24,29,0.18)',
  iconCircle: '0 8px 20px rgba(22,24,29,0.08)',
  coverMd: 'inset 5px 0 0 rgba(0,0,0,0.18), 0 16px 32px rgba(22,24,29,0.2)',
  ringFocus: '0 0 0 3px #2B47C9',
  ringError: '0 0 0 2px #D43B2F',
  ringWarning: '0 0 0 2px #D08A0B',
  ringOverdueCard: 'inset 0 0 0 1px #F3CBC5',
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
  buttonXs: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },

  // Специальные размеры из экспорта экранов (вне основной шкалы).
  input: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 22 },
  inputMd: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  inputSm: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  stat: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26 },
  counter: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 24 },
  code: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: 1.76 },
  codeLg: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, letterSpacing: 2.8 },
  table: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  tableMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17 },
  tableStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17 },
  titleSm: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  overline: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.24 },
  microRegular: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  badge: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 18 },
  stepperSign: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 22 },
  coverTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 19 },
  coverSubtitle: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 13 },
  coverAuthors: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 12, letterSpacing: 0.36 },
} satisfies Record<string, TextStyleToken>;

/** Размер инициалов в аватаре по диаметру круга. */
export const avatarFont = { 28: 11, 30: 11, 40: 13, 48: 16, 64: 22, 80: 28 } as const;

/** Фон экрана: градиент 170° и цветные ауры сверху. */
export const gradients = {
  ground: `linear-gradient(170deg, ${colors.groundTop} 0%, ${colors.groundMid} 40%, ${colors.groundBottom} 100%)`,
  auraViolet: `radial-gradient(110% 75% at 5% 0%, ${colors.auraViolet} 0%, rgba(110,134,242,0) 58%)`,
  auraPeach: `radial-gradient(85% 65% at 100% 8%, ${colors.auraPeach} 0%, rgba(255,170,130,0) 58%)`,
  auraMint: `radial-gradient(80% 55% at 55% 85%, ${colors.auraMint} 0%, rgba(110,200,165,0) 62%)`,
} as const;

/** Цветные пятна фона по разделам (слои Pattern_Background_* в макетах). */
export const backgrounds = {
  search: {
    height: 380,
    image: `${gradients.auraViolet}, ${gradients.auraPeach}, ${gradients.auraMint}`,
  },
  login: {
    height: 420,
    image:
      'radial-gradient(100% 70% at 0% 0%, rgba(110,134,242,0.42) 0%, rgba(110,134,242,0) 60%), ' +
      'radial-gradient(80% 60% at 100% 20%, rgba(110,200,165,0.38) 0%, rgba(110,200,165,0) 62%), ' +
      'radial-gradient(70% 50% at 60% 90%, rgba(255,170,130,0.3) 0%, rgba(255,170,130,0) 65%)',
  },
  bookings: {
    height: 360,
    image:
      'radial-gradient(100% 70% at 100% 0%, rgba(110,134,242,0.4) 0%, rgba(110,134,242,0) 60%), ' +
      'radial-gradient(80% 60% at 0% 20%, rgba(255,170,130,0.38) 0%, rgba(255,170,130,0) 62%)',
  },
  book: {
    height: 440,
    image:
      'radial-gradient(60% 55% at 75% 42%, rgba(79,163,165,0.62) 0%, rgba(79,163,165,0) 70%), ' +
      'radial-gradient(55% 45% at 100% 0%, rgba(110,134,242,0.4) 0%, rgba(110,134,242,0) 70%), ' +
      'radial-gradient(50% 45% at 0% 10%, rgba(255,170,130,0.3) 0%, rgba(255,170,130,0) 70%)',
  },
  profile: {
    height: 360,
    image:
      'radial-gradient(100% 70% at 100% 0%, rgba(110,200,165,0.4) 0%, rgba(110,200,165,0) 60%), ' +
      'radial-gradient(80% 60% at 0% 20%, rgba(110,134,242,0.38) 0%, rgba(110,134,242,0) 62%)',
  },
  details: {
    height: 380,
    image:
      'radial-gradient(70% 55% at 50% 30%, rgba(79,163,165,0.45) 0%, rgba(79,163,165,0) 70%), ' +
      'radial-gradient(60% 50% at 100% 0%, rgba(110,134,242,0.35) 0%, rgba(110,134,242,0) 70%)',
  },
  success: {
    height: 400,
    image:
      'radial-gradient(100% 70% at 0% 0%, rgba(110,200,165,0.5) 0%, rgba(110,200,165,0) 60%), ' +
      'radial-gradient(80% 60% at 100% 15%, rgba(110,134,242,0.38) 0%, rgba(110,134,242,0) 62%), ' +
      'radial-gradient(70% 50% at 50% 95%, rgba(255,210,140,0.3) 0%, rgba(255,210,140,0) 65%)',
  },
  desktop:
    'radial-gradient(50% 45% at 0% 0%, rgba(110,134,242,0.3) 0%, rgba(110,134,242,0) 70%), ' +
    'radial-gradient(40% 40% at 100% 0%, rgba(255,170,130,0.32) 0%, rgba(255,170,130,0) 70%), ' +
    'radial-gradient(45% 45% at 85% 100%, rgba(110,200,165,0.25) 0%, rgba(110,200,165,0) 70%), ' +
    gradients.ground,
  logo: `linear-gradient(140deg, ${colors.brandTeal} 0%, ${colors.brandBlue} 100%)`,
  statDisc: `linear-gradient(145deg, ${colors.surface} 0%, #E3E6EA 100%)`,
  scan: 'radial-gradient(70% 70% at 50% 40%, #3B4250 0%, #1B1E24 100%)',
  skeleton: 'linear-gradient(90deg, #E3E5E8, #EEF0F2)',
  skeletonBlock: 'linear-gradient(160deg, #E3E5E8, #F1F2F4)',
  shelfCard:
    'radial-gradient(70% 60% at 15% 10%, rgba(110,134,242,0.35), rgba(110,134,242,0) 70%), linear-gradient(180deg, #F6F7FB 0%, #FFFFFF 100%)',
  shelfNotFound:
    'radial-gradient(80% 70% at 20% 10%, rgba(110,134,242,0.35), rgba(110,134,242,0) 70%), linear-gradient(180deg, #F6F7FB, #FFFFFF)',
  shelfNoBookings:
    'radial-gradient(70% 60% at 85% 15%, rgba(110,134,242,0.35), rgba(110,134,242,0) 70%), radial-gradient(60% 60% at 10% 30%, rgba(110,200,165,0.35), rgba(110,200,165,0) 70%), linear-gradient(180deg, #F6F7FB 0%, #FFFFFF 100%)',
  shelfPlank: 'linear-gradient(180deg, #D9DCE1, #C5C9CF)',
  shelfPlankFlat: '#C5C9CF',
  shelfGapBorder: '#9AA0A9',
  successBadge: 'linear-gradient(110deg, rgba(221,240,228,0.95) 0%, rgba(232,236,255,0.9) 100%)',
  successCheck: 'linear-gradient(140deg, #2E9B5F, #57C08A)',
} as const;

/** Градиент обложки по цвету: 160°, from → to. */
export function coverGradient(color: CoverColor, reverse = false): string {
  const c = covers[color];
  return reverse
    ? `linear-gradient(180deg, ${c.to}, ${c.from})`
    : `linear-gradient(${coverGradientAngle}deg, ${c.from}, ${c.to})`;
}

/** Градиент аватара: 140°, как у обложек. */
export function avatarGradient(color: CoverColor): string {
  const c = covers[color];
  return `linear-gradient(140deg, ${c.from}, ${c.to})`;
}

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
