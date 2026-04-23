import { useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme as useAppTheme } from '../hooks/useTheme';
import { createAppTheme } from './index';
import BRAND from '../config/brand';

export default function ThemeProvider({ children }) {
  const { i18n } = useTranslation();
  const { theme: colorMode } = useAppTheme();

  const isRTL = i18n.language === 'ar';
  const mode = colorMode === 'dark' ? 'dark' : 'light';
  const colors = BRAND.themeColors[mode];

  const theme = useMemo(
    () =>
      createAppTheme({
        mode,
        isRTL,
        colors,
      }),
    [mode, isRTL, colors]
  );

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
    document.documentElement.setAttribute('data-theme', mode);

    document.documentElement.style.setProperty('--theme-primary', colors.primary);
    document.documentElement.style.setProperty('--theme-secondary', colors.secondary);
    document.documentElement.style.setProperty('--theme-accent', colors.accent);
  }, [isRTL, i18n.language, mode, colors]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

export { createAppTheme };