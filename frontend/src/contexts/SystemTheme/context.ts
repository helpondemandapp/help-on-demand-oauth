import React from 'react';

export const SystemThemeContext = React.createContext<'light' | 'dark'>('light');

export const useSystemTheme = () => {
  return React.useContext(SystemThemeContext);
};
