import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';

interface MenuOverlayProps {
  onLogout: () => void;
}

export const MenuOverlay = ({ onLogout }: MenuOverlayProps) => {
  return (
    <View style={styles.menuOverlay}>
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <MaterialCommunityIcons name="logout" size={20} color="white" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  menuOverlay: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: LogoColors.primary.red,
    borderRadius: 8,
    padding: 12,
    zIndex: 10,
    elevation: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});