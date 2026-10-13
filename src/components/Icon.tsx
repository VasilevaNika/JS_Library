import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, iconSize } from '@/theme/tokens';

// Линейные иконки из design/system и design/screens: viewBox 24, обводка currentColor, скруглённые концы.
const ICONS = {
  search: { sw: 1.9, d: <><Circle cx="11" cy="11" r="7" /><Path d="M20 20l-3.5-3.5" /></> },
  bookmark: { sw: 1.75, d: <Path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" /> },
  bookmarkPlus: { sw: 1.9, d: <><Path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" /><Path d="M12 8v5M9.5 10.5h5" /></> },
  user: { sw: 1.75, d: <><Circle cx="12" cy="8" r="4" /><Path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></> },
  menu: { sw: 1.75, d: <Path d="M5 8h14M5 12h14M5 16h14" /> },
  back: { sw: 1.9, d: <Path d="M15 6l-6 6 6 6" /> },
  chevron: { sw: 1.9, d: <Path d="M9 6l6 6-6 6" /> },
  chevronDown: { sw: 2, d: <Path d="M6 9l6 6 6-6" /> },
  close: { sw: 1.9, d: <Path d="M6 6l12 12M18 6L6 18" /> },
  closeSmall: { sw: 2, d: <Path d="M7 7l10 10M17 7L7 17" /> },
  check: { sw: 2.4, d: <Path d="M5 12.5l4.5 4.5L19 7.5" /> },
  clock: { sw: 1.9, d: <><Circle cx="12" cy="12" r="8" /><Path d="M12 8v4l3 2" /></> },
  calendar: { sw: 1.75, d: <><Rect x="4" y="5" width="16" height="15" rx="3" /><Path d="M8 3v4M16 3v4M4 10h16" /></> },
  barcode: { sw: 1.75, d: <Path d="M4 6v12M7 6v12M10.5 6v12M13 6v12M16.5 6v12M20 6v12" /> },
  sliders: { sw: 1.9, d: <><Path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><Circle cx="16" cy="7" r="2" /><Circle cx="10" cy="17" r="2" /></> },
  sort: { sw: 1.9, d: <Path d="M8 4v16M8 20l-3-3M8 20l3-3M16 20V4M16 4l-3 3M16 4l3 3" /> },
  download: { sw: 1.9, d: <Path d="M12 4v11M7 10l5 5 5-5M5 20h14" /> },
  upload: { sw: 1.8, d: <Path d="M12 16V5M7 10l5-5 5 5M5 20h14" /> },
  logout: { sw: 1.9, d: <Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4" /> },
  eye: { sw: 1.9, d: <><Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><Circle cx="12" cy="12" r="3" /></> },
  edit: { sw: 1.9, d: <><Path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16v4z" /><Path d="M13.5 6.5l4 4" /></> },
  bookOpen: { sw: 1.8, d: <><Path d="M12 6.5c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" /><Path d="M12 6.5V19.5" /></> },
  wifiOff: { sw: 1.9, d: <Path d="M3 9a13 13 0 0 1 18 0M6.5 12.5a8 8 0 0 1 11 0M10 16a3 3 0 0 1 4 0M12 19.5h0M4 4l16 16" /> },
  message: { sw: 1.75, d: <Path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /> },
  mail: { sw: 1.9, d: <><Rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><Path d="M4 7l8 6 8-6" /></> },
  refresh: { sw: 1.9, d: <Path d="M4 12a8 8 0 1 1 2.4 5.7M4 18v-4h4" /> },
  camera: { sw: 2.2, d: <><Path d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle cx="12" cy="13" r="3.5" /></> },
  cameraOff: { sw: 1.8, d: <Path d="M3 8h3l2-3h5M21 12v7H3V8M15 5h2l2 3M3 3l18 18" /> },
  plus: { sw: 2, d: <Path d="M12 5v14M5 12h14" /> },
  fileUpload: { sw: 1.8, d: <><Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><Path d="M14 3v5h5M12 18v-6M9 14l3-3 3 3" /></> },
  fileSheet: { sw: 1.8, d: <><Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><Path d="M14 3v5h5M9 13h6M9 17h6" /></> },
  alert: { sw: 2, d: <><Path d="M12 7v6M12 17h0" /><Circle cx="12" cy="12" r="9" /></> },
  spinner: { sw: 2.2, d: <Path d="M12 3a9 9 0 1 0 9 9" /> },
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  /** 18 — таблица и тулбар, 20 — кнопки и InfoRow, 22 — иконки-кнопки, 24 — таб-бар. */
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = iconSize.button, color = colors.ink, strokeWidth }: Props) {
  const icon = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth ?? icon.sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon.d}
    </Svg>
  );
}
