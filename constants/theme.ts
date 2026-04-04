import { MD3DarkTheme } from 'react-native-paper';

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#6366f1',
    primaryContainer: '#4f46e5',
    secondary: '#6366f1',
    secondaryContainer: '#4f46e5',
    background: '#0C0C12',
    surface: '#1C1C26',
    surfaceVariant: '#252530',
    error: '#ef4444',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onBackground: '#F0F0F5',
    onSurface: '#F0F0F5',
    onSurfaceVariant: '#6B7280',
    outline: '#2A2A36',
  },
};

export const colors = {
  pushup: '#3b82f6',    // blue
  squat: '#22c55e',     // green
  pullup: '#f59e0b',    // amber
  cardio: '#f472b6',    // pink bright
  bodypump: '#a855f7',  // purple
  bodycombat: '#ef4444', // red
  leapfight: '#14b8a6', // teal
  strength: '#818cf8',  // indigo bright
  both: '#c084fc',      // purple bright
};

export const calendarTheme = {
  backgroundColor: '#0C0C12',
  calendarBackground: '#1C1C26',
  textSectionTitleColor: '#6B7280',
  selectedDayBackgroundColor: '#2A2A36',
  selectedDayTextColor: '#ffffff',
  todayTextColor: '#6366f1',
  dayTextColor: '#F0F0F5',
  textDisabledColor: '#4B5563',
  dotColor: '#6366f1',
  selectedDotColor: '#ffffff',
  arrowColor: '#6366f1',
  monthTextColor: '#F0F0F5',
  indicatorColor: '#6366f1',
  textDayFontWeight: '400' as const,
  textMonthFontWeight: '600' as const,
  textDayHeaderFontWeight: '500' as const,
};
