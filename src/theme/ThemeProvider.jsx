/**
 * Theme Provider — STRUCTORA Design System
 * Unified theme: Deep Navy + Gold (#C8A84E)
 * No dynamic tenant colors — single brand identity
 */

import { useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme as useAppTheme } from '../hooks/useTheme';
import { createAppTheme } from './index';
import BRAND from '../config/brand';

/** STRUCTORA brand — fixed, no tenant overrides */
const STRUCTORA_GOLD = BRAND.primaryColor;

/**
 * Theme Provider Component
 * Wraps the application with MUI theme, dark mode, and CSS baseline
 */
export default function ThemeProvider({ children }) {
  const { i18n } = useTranslation();
  const { theme: colorMode } = useAppTheme();

  const isRTL = i18n.language === 'ar';

  // Create MUI theme — only reacts to color mode and RTL
  const theme = useMemo(
    () =>
      createAppTheme({
        primaryColor: STRUCTORA_GOLD,
        mode: colorMode,
        isRTL,
      }),
    [colorMode, isRTL]
  );

  // Apply document direction
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [isRTL, i18n.language]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

export { createAppTheme };
