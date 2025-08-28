import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';
import type { ComponentProps } from 'react';import { router } from 'expo-router';
;

interface QuickActionProps {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
}

const QuickAction = ({ icon, label, onPress }: QuickActionProps) => (
  <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={24} color={LogoColors.primary.red} />
    <Text style={styles.quickActionText}>{label}</Text>
  </TouchableOpacity>
);

export const QuickActions = () => {
  return (
    <View style={styles.quickActionsRow}>
      <QuickAction icon="account-box" label="Clients" onPress={() => {router.replace('/(tabs)/clients')}} />
      {/* <QuickAction icon="bell" label="Alerts" onPress={() => {}} /> */}
      {/* <QuickAction icon="chart-bar" label="Reports" onPress={() => {}} /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionButton: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: LogoColors.background.secondary,
    borderRadius: 8,
  },
  quickActionText: {
    color: LogoColors.primary.red,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
});