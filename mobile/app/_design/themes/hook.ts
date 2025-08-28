const useTheme = () => {
  return {
    colors: {
      primary: '#6200ee',
      bgSecondary: '#f5f5f5',
      textPrimary: '#000000',
      textSecondary: '#666666',
    },
    typography: {
      heading1: { fontSize: 24, fontWeight: 'bold' },
      heading2: { fontSize: 18, fontWeight: '700' },
      body: { fontSize: 14 },
    },
    spacing: {
      sm: 8,
      md: 16,
      lg: 24,
    },
  };
};

export default useTheme;