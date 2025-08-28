import React from 'react';
import typography from '../tokens/typography';
import spacing from '../tokens/spacing';
import { LogoColors as colors } from '@/constants/Colors';

const ThemeContext = React.createContext({
  colors,
  typography: {
    ...typography,
    button: {
      fontSize: 16,
      fontWeight: '600',
    },
  },
  spacing,
});

export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <ThemeContext.Provider
    value={{
      colors,
      typography: {
        ...typography,
        button: {
          fontSize: 16,
          fontWeight: '600',
        },
      },
      spacing,
    }}
  >
    {children}
  </ThemeContext.Provider>
);

export const useTheme = () => React.useContext(ThemeContext);

export default ThemeContext;