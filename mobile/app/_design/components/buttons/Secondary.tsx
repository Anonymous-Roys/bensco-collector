import { LogoColors } from '@/constants/Colors';
import { Pressable, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SecondaryButton = ({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon?: string;
  onPress: () => void;
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? LogoColors.secondary.navyDark : LogoColors.secondary.navy,
        },
      ]}
    >
      {icon && (
        <Icon 
          name={icon} 
          size={20} 
          color={LogoColors.text.onPrimary} 
          style={styles.icon} 
        />
      )}
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
  },
  text: {
    color: LogoColors.text.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    marginRight: 8,
  },
});

export default SecondaryButton;