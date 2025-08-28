import { LogoColors } from '@/constants/Colors';
import { View, Text, StyleSheet } from 'react-native';


const OfflineBadge = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Offline Mode</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: LogoColors.status.warning,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    color: LogoColors.text.onPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default OfflineBadge;