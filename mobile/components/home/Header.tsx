import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';

interface HeaderProps {
  name: string;
  id: string;
  profilePhoto: any;
  onMenuPress: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const Header = ({ name, id, profilePhoto, onMenuPress, onRefresh, refreshing }: HeaderProps) => {
  return (
    <View style={styles.header}>
      <View style={styles.profileSection}>
        <Image 
          source={profilePhoto} 
          style={styles.profileImage} 
        />
        <View>
          <Text style={styles.greetingText}>Good morning, {name}!</Text>
          <Text style={styles.workerIdText}>ID: {id}</Text>
        </View>
      </View>
      
      <View style={styles.headerIcons}>
        {onRefresh && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={onRefresh}
            disabled={refreshing}
          >
            <MaterialCommunityIcons 
              name="refresh" 
              size={24} 
              color={LogoColors.text.onPrimary} 
              style={refreshing ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={onMenuPress}
        >
          <MaterialCommunityIcons name="menu" size={24} color={LogoColors.text.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: LogoColors.primary.red,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: LogoColors.background.primary,
  },
  greetingText: {
    color: LogoColors.text.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  workerIdText: {
    color: LogoColors.text.onPrimary,
    fontSize: 12,
    opacity: 0.8,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
});