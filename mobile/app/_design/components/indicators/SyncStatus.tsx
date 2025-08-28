import { LogoColors } from '@/constants/Colors';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SyncStatus = ({ lastSynced }: { lastSynced: string }) => {
  return (
    <View style={styles.container}>
      <Icon 
        name="cloud-done" 
        size={16} 
        color={LogoColors.status.success} 
      />
      <Text style={styles.text}>Synced {lastSynced}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    color: LogoColors.text.secondary,
    fontSize: 12,
  },
});

export default SyncStatus;