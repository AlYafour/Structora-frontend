/**
 * MUI Theme Configuration — STRUCTORA Design System
 * Colors now come from one central source: BRAND.themeColors
 */

import { createTheme, alpha } from '@mui/material/styles';
import { arEG, enUS } from '@mui/material/locale';
import { adjustColorBrightness } from '../utils/ui/colors';

const DEFAULT_COLORS = {
  primary: '#C8A84E',
  secondary: '#0B1629',
  accent: '#101E36',
};

const createBaseTheme = (mode = 'light', colors = DEFAULT_COLORS, isRTL = false) => {
  const isDark = mode === 'dark';

  const PRIMARY = colors.primary;
  const SECONDARY = colors.secondary;
  const ACCENT = colors.accent;

  const primary = {
    main: PRIMARY,
    light: alpha(PRIMARY, 0.15),
    dark: adjustColorBrightness(PRIMARY, -20),
    contrastText: isDark ? SECONDARY : '#FFFFFF',
  };

  return createTheme(
    {
      direction: isRTL ? 'rtl' : 'ltr',

      palette: {
        mode,
        primary,
        secondary: {
          main: SECONDARY,
          light: alpha(SECONDARY, 0.15),
          dark: adjustColorBrightness(SECONDARY, -20),
          contrastText: '#ffffff',
        },
        success: {
          main: '#5EBB7C',
          light: '#d1fae5',
          dark: '#43A047',
          contrastText: '#ffffff',
        },
        warning: {
          main: PRIMARY,
          light: alpha(PRIMARY, 0.18),
          dark: adjustColorBrightness(PRIMARY, -20),
          contrastText: SECONDARY,
        },
        error: {
          main: '#E85D56',
          light: '#fee2e2',
          dark: '#C82333',
          contrastText: '#ffffff',
        },
        info: {
          main: '#5BC0EB',
          light: '#D4DDEF',
          dark: '#0288D1',
          contrastText: '#ffffff',
        },
        background: {
          default: isDark ? adjustColorBrightness(SECONDARY, -6) : '#F4F1EB',
          paper: isDark ? ACCENT : '#FFFFFF',
        },
        text: {
          primary: isDark ? '#FFFFFF' : '#1A1408',
          secondary: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,20,8,0.65)',
          disabled: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(26,20,8,0.3)',
        },
        divider: isDark ? alpha(PRIMARY, 0.08) : 'rgba(26,20,8,0.1)',
        grey: {
          50: '#F4F1EB',
          100: '#EDE9E0',
          200: '#D4DDEF',
          300: '#8A9BBF',
          400: '#6B7FA3',
          500: '#4A5E80',
          600: '#3A4D6E',
          700: adjustColorBrightness(ACCENT, 10),
          800: ACCENT,
          900: SECONDARY,
        },
      },

      typography: {
        fontFamily: [
          '"Cairo"',
          '"DM Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ].join(','),
        fontSize: 13,
        fontWeightLight: 300,
        fontWeightRegular: 400,
        fontWeightMedium: 500,
        fontWeightBold: 700,
        h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 },
        h2: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3 },
        h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
        h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
        h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
        h6: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },
        subtitle1: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
        subtitle2: { fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5 },
        body1: { fontSize: '0.875rem', lineHeight: 1.5 },
        body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
        button: { fontSize: '0.8125rem', fontWeight: 600, textTransform: 'none' },
        caption: { fontSize: '0.6875rem', lineHeight: 1.5 },
        overline: {
          fontSize: '0.6875rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
      },

      shape: {
        borderRadius: 8,
      },

      shadows: [
        'none',
        '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        ...Array(18).fill('0 25px 50px -12px rgb(0 0 0 / 0.25)'),
      ],

      components: {
        MuiCssBaseline: {
          styleOverrides: {
            '*': { boxSizing: 'border-box' },
            html: { scrollBehavior: 'smooth' },
            body: { direction: isRTL ? 'rtl' : 'ltr' },
            '::-webkit-scrollbar': { width: '6px', height: '6px' },
            '::-webkit-scrollbar-track': {
              background: isDark ? adjustColorBrightness(SECONDARY, -2) : '#EDE9E0',
            },
            '::-webkit-scrollbar-thumb': {
              background: isDark ? alpha(PRIMARY, 0.2) : 'rgba(26,20,8,0.15)',
              borderRadius: '3px',
            },
            '::-webkit-scrollbar-thumb:hover': {
              background: isDark ? alpha(PRIMARY, 0.35) : 'rgba(26,20,8,0.25)',
            },
          },
        },

        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: '8px',
              fontWeight: 600,
              textTransform: 'none',
              padding: '6px 14px',
              minHeight: '34px',
              transition: 'all 0.2s ease-in-out',
            },
            contained: {
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
              '&:hover': {
                boxShadow: isDark
                  ? `0 8px 24px ${alpha(PRIMARY, 0.25)}`
                  : `0 4px 12px ${alpha(PRIMARY, 0.2)}`,
                transform: 'translateY(-1px)',
              },
            },
            outlined: {
              borderWidth: '1px',
              borderColor: isDark ? alpha(PRIMARY, 0.2) : 'rgba(26,20,8,0.12)',
              '&:hover': {
                borderWidth: '1px',
                borderColor: PRIMARY,
              },
            },
            sizeLarge: {
              padding: '8px 20px',
              fontSize: '0.875rem',
              minHeight: '42px',
            },
            sizeSmall: {
              padding: '3px 10px',
              fontSize: '0.75rem',
              minHeight: '28px',
            },
          },
          defaultProps: {
            disableElevation: true,
          },
        },

        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                minHeight: '34px',
                transition: 'box-shadow 0.2s ease-in-out',
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? alpha(PRIMARY, 0.3) : PRIMARY,
                  },
                },
                '&.Mui-focused': {
                  boxShadow: `0 0 0 3px ${alpha(PRIMARY, 0.12)}`,
                },
              },
            },
          },
          defaultProps: {
            size: 'small',
            variant: 'outlined',
          },
        },

        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: '12px',
              boxShadow: isDark ? 'none' : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
              border: isDark
                ? `1px solid ${alpha(PRIMARY, 0.06)}`
                : '1px solid rgba(26,20,8,0.08)',
              transition: 'all 0.3s ease-in-out',
              backgroundColor: isDark ? alpha(ACCENT, 0.5) : '#FFFFFF',
              '&:hover': {
                borderColor: isDark ? alpha(PRIMARY, 0.15) : 'rgba(26,20,8,0.15)',
                boxShadow: isDark
                  ? '0 20px 60px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.08)',
              },
            },
          },
        },
      },
    },
    isRTL ? arEG : enUS
  );
};

export const createAppTheme = ({ mode = 'light', isRTL = false, colors = DEFAULT_COLORS }) =>
  createBaseTheme(mode, colors, isRTL);

export default createAppTheme;