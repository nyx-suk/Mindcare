export type AppTheme = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  primary: string;
  primaryLight: string;
  textPrimary: string;
  textSecondary: string;
  textHint: string;
  border: string;
  borderFocus: string;
  error: string;
  errorSurface: string;
  warning: string;
  warningSurface: string;
  success: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
};

export const DARK_THEME: AppTheme = {
  background: '#0f1923',
  surface: '#162330',
  surfaceSecondary: '#1e2d3d',
  primary: '#00897b',
  primaryLight: '#4db6ac',
  textPrimary: '#f0f4f8',
  textSecondary: 'rgba(240,244,248,0.55)',
  textHint: 'rgba(240,244,248,0.3)',
  border: 'rgba(255,255,255,0.07)',
  borderFocus: '#00897b',
  error: '#ef5350',
  errorSurface: 'rgba(239,83,80,0.12)',
  warning: '#ffb74d',
  warningSurface: 'rgba(255,183,77,0.12)',
  success: '#4db6ac',
  tabBar: '#162330',
  tabBarActive: '#4db6ac',
  tabBarInactive: 'rgba(240,244,248,0.35)',
};

export const LIGHT_THEME: AppTheme = {
  background: '#f0f7f6',
  surface: '#ffffff',
  surfaceSecondary: '#f5fafa',
  primary: '#00897b',
  primaryLight: '#4db6ac',
  textPrimary: '#1a2e2b',
  textSecondary: '#546e7a',
  textHint: '#b0bec5',
  border: '#d0e9e6',
  borderFocus: '#00897b',
  error: '#d32f2f',
  errorSurface: '#ffebee',
  warning: '#f57c00',
  warningSurface: '#fff3e0',
  success: '#00897b',
  tabBar: '#ffffff',
  tabBarActive: '#00897b',
  tabBarInactive: '#90a4ae',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

export const RADIUS = {
  input: 10,
  button: 28,
  card: 16
} as const;
