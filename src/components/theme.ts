export const colors = {
  primary: '#F26522',
  primaryLight: '#FF8C4B',
  primaryDark: '#C44D14',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  ignitionOn: '#10B981',
  ignitionOff: '#EF4444',
  inactive: '#D1D5DB',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
} as const;

export const radius = {
  sm: 6, md: 10, lg: 14, xl: 20, full: 9999,
} as const;

export const fontSize = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, xxxl: 30,
} as const;
