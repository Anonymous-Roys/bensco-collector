import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';
import { Client } from '@/constants/types';

interface ClientCardProps {
  client: Client;
  onPress: () => void;
  onQuickCollect: () => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({ client, onPress, onQuickCollect }) => {
  // For now, we'll show all clients as active since the backend doesn't provide status
  const status = 'active';
  const isCollectedToday = false; // We'll need to implement this based on contributions

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return LogoColors.status.success;
      case 'pending': return LogoColors.status.warning;
      case 'complete': return LogoColors.secondary.navy;
      case 'inactive': return LogoColors.text.secondary;
      default: return LogoColors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'check-circle';
      case 'pending': return 'clock-outline';
      case 'complete': return 'trophy';
      case 'inactive': return 'pause-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[styles.clientCard, isCollectedToday && styles.collectedCard]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.clientInfo}>
          <View style={[styles.avatar, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.avatarText}>
              {client.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.clientDetails}>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.clientPhone}>{client.phone_number}</Text>
            <Text style={styles.lastContribution}>
              Created: {formatDate(client.created_at)}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <MaterialCommunityIcons
              name={getStatusIcon(status)} 
              size={12} 
              color={LogoColors.text.onPrimary} 
            />
            <Text style={styles.statusText}>
              {status.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.quickCollectBtn}
            onPress={onQuickCollect}
          >
            <MaterialCommunityIcons name="plus" size={16} color={LogoColors.primary.red} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={styles.balanceText}>
            Daily: GHS {parseFloat(client.amount_daily).toLocaleString()}
          </Text>
          <Text style={styles.goalText}>
            Code: {client.unique_code}
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: '100%' }]} />
        </View>
        <Text style={styles.progressPercent}>
          {client.is_fixed ? 'Fixed' : 'Variable'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  clientCard: {
    backgroundColor: LogoColors.background.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  collectedCard: {
    borderColor: LogoColors.status.success,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: LogoColors.text.onPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: LogoColors.text.primary,
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 14,
    color: LogoColors.text.secondary,
    marginBottom: 2,
  },
  lastContribution: {
    fontSize: 12,
    color: LogoColors.text.light,
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    color: LogoColors.text.onPrimary,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  quickCollectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LogoColors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LogoColors.primary.red,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressInfo: {
    flex: 1,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
  },
  goalText: {
    fontSize: 12,
    color: LogoColors.text.secondary,
  },
  progressBarContainer: {
    flex: 2,
    height: 6,
    backgroundColor: LogoColors.background.tertiary,
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: LogoColors.primary.red,
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: LogoColors.text.secondary,
    minWidth: 35,
    textAlign: 'right',
  },
});