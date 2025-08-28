import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';
import { Client } from '@/constants/types';

interface ClientInfoModalProps {
  client: Client;
  onClose: () => void;
  onCollect: () => void;
}

export const ClientInfoModal: React.FC<ClientInfoModalProps> = ({ client, onClose, onCollect }) => {
  // For now, we'll show all clients as active since the backend doesn't provide status
  const status = 'active';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return LogoColors.status.success;
      case 'pending': return LogoColors.status.warning;
      case 'complete': return LogoColors.secondary.navy;
      case 'inactive': return LogoColors.text.secondary;
      default: return LogoColors.text.secondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Client Details</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={24} color={LogoColors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent}>
        <View style={styles.clientDetailsCard}>
          <View style={styles.clientHeader}>
            <View style={[styles.largeAvatar, { backgroundColor: getStatusColor(status) }]}>
              <Text style={styles.largeAvatarText}>
                {client.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.clientTitleInfo}>
              <Text style={styles.clientDetailName}>{client.name}</Text>
              <Text style={styles.clientDetailPhone}>{client.phone_number}</Text>
              {client.address && (
                <Text style={styles.clientDetailAddress}>{client.address}</Text>
              )}
            </View>
          </View>

          <View style={styles.progressDetailSection}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <View style={styles.progressGrid}>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Daily Amount</Text>
                <Text style={styles.progressValue}>
                  GHS {parseFloat(client.amount_daily).toLocaleString()}
                </Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Payment Type</Text>
                <Text style={styles.progressValue}>
                  {client.is_fixed ? 'Fixed' : 'Variable'}
                </Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Start Date</Text>
                <Text style={styles.progressValue}>
                  {formatDate(client.start_date)}
                </Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Unique Code</Text>
                <Text style={styles.progressValue}>
                  {client.unique_code}
                </Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Collector</Text>
                <Text style={styles.progressValue}>
                  {client.collector_username}
                </Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Created</Text>
                <Text style={styles.progressValue}>
                  {formatDate(client.created_at)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onCollect}
            >
              <MaterialCommunityIcons name="cash-plus" size={20} color={LogoColors.text.onPrimary} />
              <Text style={styles.actionBtnText}>Collect</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, styles.secondaryActionBtn]}>
              <MaterialCommunityIcons name="phone" size={20} color={LogoColors.primary.red} />
              <Text style={[styles.actionBtnText, styles.secondaryActionBtnText]}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: LogoColors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: LogoColors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
  },
  closeBtn: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  clientDetailsCard: {
    backgroundColor: LogoColors.background.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  largeAvatarText: {
    color: LogoColors.text.onPrimary,
    fontSize: 28,
    fontWeight: 'bold',
  },
  clientTitleInfo: {
    flex: 1,
  },
  clientDetailName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
    marginBottom: 4,
  },
  clientDetailPhone: {
    fontSize: 16,
    color: LogoColors.text.secondary,
    marginBottom: 2,
  },
  clientDetailAddress: {
    fontSize: 14,
    color: LogoColors.text.light,
  },
  progressDetailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: LogoColors.text.primary,
    marginBottom: 16,
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  progressItem: {
    width: '50%',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    color: LogoColors.text.secondary,
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: LogoColors.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: LogoColors.primary.red,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LogoColors.primary.red,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
  },
  actionBtnText: {
    color: LogoColors.text.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryActionBtn: {
    backgroundColor: LogoColors.background.surface,
    borderWidth: 1,
    borderColor: LogoColors.primary.red,
  },
  secondaryActionBtnText: {
    color: LogoColors.primary.red,
  },
});