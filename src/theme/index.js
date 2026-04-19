/**
 * MUI Theme Configuration — STRUCTORA Design System
 * Deep Navy (#0B1629) + Gold (#C8A84E) branding
 * Fonts: Cairo (Arabic) + DM Sans (Latin) + Cormorant Garamond (Display)
 */

import { createTheme, alpha } from '@mui/material/styles';
import { arEG, enUS } from '@mui/material/locale';
import { adjustColorBrightness } from '../utils/ui/colors';

/**
 * STRUCTORA color constants
 */
const GOLD = '#C8A84E';
const GOLD_DARK = '#8B7333';
const NAVY = '#0B1629';
const NAVY_DEEP = '#060D1B';
const NAVY_MID = '#101E36';

/**
 * Create base theme with STRUCTORA branding
 */
const createBaseTheme = (mode = 'light', primaryColor = GOLD, isRTL = false) => {
  const isDark = mode === 'dark';

  const primary = {
    main: primaryColor,
    light: alpha(primaryColor, 0.15),
    dark: adjustColorBrightness(primaryColor, -20),
    contrastText: isDark ? NAVY : '#FFFFFF',
  };

  return createTheme(
    {
      direction: isRTL ? 'rtl' : 'ltr',

      // ===== Color Palette =====
      palette: {
        mode,
        primary,
        secondary: {
          main: isDark ? '#8A9BBF' : NAVY,
          light: isDark ? '#D4DDEF' : '#162848',
          dark: isDark ? '#4A5E80' : '#080F1E',
          contrastText: '#ffffff',
        },
        success: {
          main: '#5EBB7C',
          light: '#d1fae5',
          dark: '#43A047',
          contrastText: '#ffffff',
        },
        warning: {
          main: GOLD,
          light: '#F8EDCD',
          dark: GOLD_DARK,
          contrastText: NAVY,
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
          default: isDark ? '#040A14' : '#F4F1EB',
          paper: isDark ? NAVY_MID : '#FFFFFF',
        },
        text: {
          primary: isDark ? '#FFFFFF' : '#1A1408',
          secondary: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,20,8,0.65)',
          disabled: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(26,20,8,0.3)',
        },
        divider: isDark ? 'rgba(200,168,78,0.08)' : 'rgba(26,20,8,0.1)',
        grey: {
          50: '#F4F1EB',
          100: '#EDE9E0',
          200: '#D4DDEF',
          300: '#8A9BBF',
          400: '#6B7FA3',
          500: '#4A5E80',
          600: '#3A4D6E',
          700: '#1A3358',
          800: NAVY_MID,
          900: NAVY,
        },
      },

      // ===== Typography =====
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
        overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
      },

      // ===== Shape =====
      shape: {
        borderRadius: 8,
      },

      // ===== Shadows =====
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

      // ===== Component Overrides =====
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            '*': { boxSizing: 'border-box' },
            html: { scrollBehavior: 'smooth' },
            body: { direction: isRTL ? 'rtl' : 'ltr' },
            '::-webkit-scrollbar': { width: '6px', height: '6px' },
            '::-webkit-scrollbar-track': {
              background: isDark ? NAVY_DEEP : '#EDE9E0',
            },
            '::-webkit-scrollbar-thumb': {
              background: isDark ? 'rgba(200,168,78,0.2)' : 'rgba(26,20,8,0.15)',
              borderRadius: '3px',
            },
            '::-webkit-scrollbar-thumb:hover': {
              background: isDark ? 'rgba(200,168,78,0.35)' : 'rgba(26,20,8,0.25)',
            },
          },
        },

        // Buttons
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
                  ? '0 8px 24px rgba(200,168,78,0.25)'
                  : '0 4px 12px rgba(200,168,78,0.2)',
                transform: 'translateY(-1px)',
              },
            },
            outlined: {
              borderWidth: '1px',
              borderColor: isDark ? 'rgba(200,168,78,0.2)' : 'rgba(26,20,8,0.12)',
              '&:hover': {
                borderWidth: '1px',
                borderColor: isDark ? 'rgba(200,168,78,0.4)' : GOLD,
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

        // TextField
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                minHeight: '34px',
                transition: 'box-shadow 0.2s ease-in-out',
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(200,168,78,0.3)' : GOLD,
                  },
                },
                '&.Mui-focused': {
                  boxShadow: `0 0 0 3px ${alpha(GOLD, 0.12)}`,
                },
              },
            },
          },
          defaultProps: {
            size: 'small',
            variant: 'outlined',
          },
        },

        // Card
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: '12px',
              boxShadow: isDark
                ? 'none'
                : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
              border: isDark
                ? '1px solid rgba(200,168,78,0.06)'
                : '1px solid rgba(26,20,8,0.08)',
              transition: 'all 0.3s ease-in-out',
              backgroundColor: isDark
                ? 'rgba(16,30,54,0.5)'
                : '#FFFFFF',
              '&:hover': {
                borderColor: isDark
                  ? 'rgba(200,168,78,0.15)'
                  : 'rgba(26,20,8,0.15)',
                boxShadow: isDark
                  ? '0 20px 60px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.08)',
              },
            },
          },
        },

        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: '6px',
              fontWeight: 500,
              height: '24px',
              fontSize: '0.75rem',
            },
          },
        },

        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: '14px',
              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
              border: isDark ? '1px solid rgba(200,168,78,0.08)' : 'none',
              backgroundColor: isDark ? NAVY_MID : '#FFFFFF',
            },
          },
        },

        // Table
        MuiTableCell: {
          styleOverrides: {
            root: {
              padding: '8px 12px',
              fontSize: '0.8125rem',
              borderBottom: isDark
                ? '1px solid rgba(200,168,78,0.06)'
                : '1px solid rgba(26,20,8,0.08)',
            },
            head: {
              fontWeight: 600,
              fontSize: '0.6875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              backgroundColor: isDark ? 'rgba(6,13,27,0.5)' : '#F9F7F3',
              color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,20,8,0.5)',
            },
          },
        },

        MuiAutocomplete: {
          styleOverrides: {
            paper: {
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              border: isDark
                ? '1px solid rgba(200,168,78,0.1)'
                : '1px solid rgba(26,20,8,0.08)',
            },
            option: {
              borderRadius: '6px',
              margin: '2px 4px',
              fontSize: '0.8125rem',
              '&:hover': {
                backgroundColor: alpha(GOLD, 0.08),
              },
              '&[aria-selected="true"]': {
                backgroundColor: alpha(GOLD, 0.15),
                '&:hover': {
                  backgroundColor: alpha(GOLD, 0.2),
                },
              },
            },
          },
        },

        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              backgroundColor: isDark ? '#F4F1EB' : NAVY,
              color: isDark ? NAVY : '#FFFFFF',
              borderRadius: '6px',
              fontSize: '0.6875rem',
              padding: '4px 8px',
            },
          },
        },

        MuiLinearProgress: {
          styleOverrides: {
            root: { borderRadius: '3px', height: '4px' },
          },
        },

        MuiAlert: {
          styleOverrides: {
            root: { borderRadius: '8px', fontSize: '0.8125rem' },
          },
        },

        MuiTablePagination: {
          styleOverrides: {
            root: { fontSize: '0.8125rem' },
            selectLabel: { fontSize: '0.8125rem' },
            displayedRows: { fontSize: '0.8125rem' },
          },
        },
      },

      // ===== Z-Index =====
      zIndex: {
        mobileStepper: 1000,
        fab: 1050,
        speedDial: 1050,
        appBar: 1100,
        drawer: 1200,
        modal: 1300,
        snackbar: 1400,
        tooltip: 1500,
      },

      // ===== Transitions =====
      transitions: {
        duration: {
          shortest: 100,
          shorter: 150,
          short: 200,
          standard: 250,
          complex: 300,
          enteringScreen: 200,
          leavingScreen: 150,
        },
        easing: {
          easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
          easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
          easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
          sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
        },
      },
    },
    isRTL ? arEG : enUS
  );
};

/**
 * Create theme with tenant branding
 */
export function createAppTheme({
  primaryColor = GOLD,
  mode = 'light',
  isRTL = false,
} = {}) {
  return createBaseTheme(mode, primaryColor, isRTL);
}

export const defaultTheme = createAppTheme();
export default createAppTheme;
