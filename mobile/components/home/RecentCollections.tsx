import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';

interface CollectionItem {
  id: string;
  clientName: string;
  amount: number;
  time: string;
  synced: boolean;
}

interface RecentCollectionsProps {
  collections: CollectionItem[];
}

const CollectionItem = ({ clientName, amount, time, synced }: CollectionItem) => (
  <View style={styles.recentItem}>
    <View style={styles.recentItemLeft}>
      <MaterialCommunityIcons 
        name={synced ? 'cloud-check' : 'cloud-off-outline'} 
        size={20} 
        color={synced ? LogoColors.status.success : LogoColors.status.warning} 
      />
      <View style={styles.recentItemText}>
        <Text style={styles.clientName}>{clientName}</Text>
        <Text style={styles.clientAmount}>GHS {amount.toFixed(2)}</Text>
      </View>
    </View>
    <Text style={styles.clientTime}>{time}</Text>
  </View>
);

export const RecentCollections = ({ collections }: RecentCollectionsProps) => {
  return (
    <>
      <Text style={styles.sectionTitle}>Recent Collections</Text>
      <View style={styles.recentList}>
        {collections.slice(0, 3).map((item) => (
          <CollectionItem key={item.id} {...item} />
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
    marginBottom: 12,
  },
  recentList: {
    gap: 8,
    marginBottom: 24,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: LogoColors.background.secondary,
    borderRadius: 8,
    padding: 12,
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentItemText: {
    gap: 2,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '500',
    color: LogoColors.text.primary,
  },
  clientAmount: {
    fontSize: 12,
    color: LogoColors.text.secondary,
  },
  clientTime: {
    fontSize: 12,
    color: LogoColors.text.light,
  },
});