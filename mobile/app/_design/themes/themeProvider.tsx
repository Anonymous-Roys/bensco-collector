// app/_design/themes/ThemeProvider.tsx
import React, { createContext } from 'react';
import { LogoColors as colors } from '@/constants/Colors';
import Typography from '../tokens/typography';

type Theme = {
  colors: typeof colors;
  typography: typeof Typography;
};

export const ThemeContext = createContext<Theme>({
  colors,
  typography: Typography,
});

const ThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <ThemeContext.Provider value={{ colors, typography: Typography }}>
    {children}
  </ThemeContext.Provider>
);

// Hook for easy theme access
export const useTheme = () => React.useContext(ThemeContext);

export default ThemeProvider;