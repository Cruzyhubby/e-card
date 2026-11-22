import { Platform } from 'react-native';

const brandSerif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export const colors = {
  bg: '#08120E',
  bgElevated: '#0E1D17',
  surface: '#0E1D17',
  surfaceAlt: '#152B22',
  surfaceMuted: '#0B1712',
  surfaceHover: '#1E3D2F',
  border: '#24392E',
  borderStrong: '#3D7A5E',
  text: '#FDFAF3',
  textSecondary: '#E4DDCB',
  textMuted: '#A89F93',
  textDim: '#7A7266',
  accent: '#C49A3C',
  accentStrong: '#C49A3C',
  accentText: '#E2C97E',
  accentSoft: 'rgba(196, 154, 60, 0.14)',
  success: '#4FA37A',
  successSoft: 'rgba(79, 163, 122, 0.16)',
  warning: '#D4A23C',
  warningSoft: 'rgba(212, 162, 60, 0.16)',
  danger: '#C8665C',
  dangerStrong: '#8B2E2E',
  dangerText: '#E5A198',
  dangerSoft: 'rgba(200, 102, 92, 0.16)',
  white: '#FDFAF3',
  black: '#000000',
  scrim: 'rgba(2, 8, 5, 0.72)',
  cameraShade: 'rgba(5, 13, 9, 0.55)',
};

export const tones = {
  accent: {
    base: '#C49A3C',
    soft: 'rgba(196, 154, 60, 0.14)',
    border: 'rgba(196, 154, 60, 0.4)',
  },
  success: {
    base: '#4FA37A',
    soft: 'rgba(79, 163, 122, 0.16)',
    border: 'rgba(79, 163, 122, 0.4)',
  },
  warning: {
    base: '#D4A23C',
    soft: 'rgba(212, 162, 60, 0.16)',
    border: 'rgba(212, 162, 60, 0.42)',
  },
  danger: {
    base: '#C8665C',
    soft: 'rgba(200, 102, 92, 0.16)',
    border: 'rgba(200, 102, 92, 0.42)',
  },
  slate: {
    base: '#A89F93',
    soft: 'rgba(168, 159, 147, 0.14)',
    border: 'rgba(168, 159, 147, 0.35)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const radius = {
  sm: 9,
  md: 12,
  lg: 18,
  xl: 22,
  pill: 999,
};

export const typography = {
  mega: { fontSize: 40, fontWeight: '800', letterSpacing: -0.8 },
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.4 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.1 },
  body: { fontSize: 14, fontWeight: '500' },
  small: { fontSize: 13, fontWeight: '500' },
  micro: { fontSize: 11, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600' },
  brand: { fontFamily: brandSerif, fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
};
