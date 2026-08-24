import { SystemThemeContext } from '@/contexts/SystemTheme/context.ts';
import React from 'react';

const SystemThemeContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeValue, setThemeValue] = React.useState<'light' | 'dark'>(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    return query.matches ? 'dark' : 'light';
  });
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const initialTheme = mediaQuery.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', initialTheme);
    const listener = (event: MediaQueryListEvent) => {
      const theme = event.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-bs-theme', theme);
      setThemeValue(theme);
    };
    mediaQuery.addEventListener('change', listener);
    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, []);
  return <SystemThemeContext.Provider value={themeValue}>{children}</SystemThemeContext.Provider>;
};

export default SystemThemeContextProvider;
