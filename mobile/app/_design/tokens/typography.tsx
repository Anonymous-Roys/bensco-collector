// app/_design/tokens/typography.ts
import { TextStyle } from 'react-native';

const Typography = {
  heading1: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  } as TextStyle,
  body: {
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,
} as const;

export default Typography;