import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';

interface ActionButtonsProps {
  onRecordPress: () => void;
  onHistoryPress: () => void;
}

export const ActionButtons = ({ onRecordPress, onHistoryPress }: ActionButtonsProps) => {
  return (
    <>
      <TouchableOpacity style={styles.primaryButton} onPress={onRecordPress}>
        <MaterialCommunityIcons name="plus" size={24} color="white" />
        <Text style={styles.primaryButtonText}>Record New Contribution</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onHistoryPress}>
        <MaterialCommunityIcons name="format-list-bulleted" size={24} color={LogoColors.primary.red} />
        <Text style={styles.secondaryButtonText}>View Collection History</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: LogoColors.primary.red,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: LogoColors.primary.red,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: LogoColors.primary.red,
    fontSize: 16,
    fontWeight: 'bold',
  },
});