import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { LogoColors } from '@/constants/Colors';
import { RootState, AppDispatch } from '@/store';
import { fetchPayouts } from '@/store/slices/payoutSlice';
import { PayoutRequest } from '@/constants/types';
// import { usePayouts } from '../../../../bensco-susu-admin/src/hooks/usePayouts';

const PayoutsScreen = () => {
  // const { pendingPayouts, allPayouts, approveMany, markManyPaid, rejectPayout, isLoading, fetchPayouts } = usePayouts();
  const dispatch = useDispatch<AppDispatch>();
  const { payouts, loading, error } = useSelector((state: RootState) => state.payouts);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      await dispatch(fetchPayouts()).unwrap();
    } catch (error) {
      console.error('Failed to load payouts:', error);
      // Don't show alert for now, just log the error
      // The empty state will be shown instead
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayouts();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'approved': return 'check-circle';
      case 'paid': return 'cash-check';
      case 'rejected': return 'close-circle';
      case 'auto_rejected': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return LogoColors.status.warning;
      case 'approved': return LogoColors.status.success;
      case 'paid': return LogoColors.primary.blue;
      case 'rejected': return LogoColors.status.error;
      case 'auto_rejected': return LogoColors.status.error;
      default: return LogoColors.text.secondary;
    }
  };

  const formatAmount = (amount: number | undefined | null) => `₵${Number(amount || 0).toFixed(2)}`;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateCommission = (amount: number) => amount / 31;
  const calculateNetAmount = (amount: number) => amount - calculateCommission(amount);

  const getFilteredPayouts = () => {
    return payouts.filter(payout => {
      const statusMatch = selectedStatus === 'all' || payout.status === selectedStatus;
      const clientMatch = selectedClient === 'all' || payout.client_name === selectedClient;
      return statusMatch && clientMatch;
    });
  };

  const getUniqueClients = () => {
    return [...new Set(payouts.map(p => p.client_name))].sort();
  };

  const getSummaryStats = () => {
    const filtered = getFilteredPayouts();
    const totalRequested = filtered.reduce((sum, p) => sum + (p.requested_amount || 0), 0);
    const pendingCount = filtered.filter(p => p.status === 'pending').length;
    const paidCount = filtered.filter(p => p.status === 'paid').length;
    const approvedCount = filtered.filter(p => p.status === 'approved').length;
    const rejectedCount = filtered.filter(p => p.status === 'rejected' || p.status === 'auto_rejected').length;

    return { totalRequested, pendingCount, paidCount, approvedCount, rejectedCount };
  };

  const stats = getSummaryStats();
  const filteredPayouts = getFilteredPayouts();
  const uniqueClients = getUniqueClients();

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Payouts</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color={LogoColors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['all', 'pending', 'approved', 'paid', 'rejected', 'auto_rejected'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    selectedStatus === status && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedStatus === status && styles.filterChipTextActive
                  ]}>
                    {status === 'all' ? 'All' : status.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Client</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedClient === 'all' && styles.filterChipActive
                ]}
                onPress={() => setSelectedClient('all')}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedClient === 'all' && styles.filterChipTextActive
                ]}>
                  All Clients
                </Text>
              </TouchableOpacity>
              {uniqueClients.map(client => (
                <TouchableOpacity
                  key={client}
                  style={[
                    styles.filterChip,
                    selectedClient === client && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedClient(client)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedClient === client && styles.filterChipTextActive
                  ]}>
                    {client}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setFilterModalVisible(false)}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderPayoutCard = (payout: PayoutRequest) => (
    <View key={payout.id} style={styles.payoutCard}>
      <View style={styles.payoutHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{payout.client_name}</Text>
          <Text style={styles.requestDate}>
            Requested: {formatDate(payout.requested_on)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payout.status) + '20' }]}>
          <MaterialCommunityIcons 
            name={getStatusIcon(payout.status)} 
            size={16} 
            color={getStatusColor(payout.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(payout.status) }]}>
            {payout.status.toUpperCase().replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.amountBreakdown}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Requested Amount:</Text>
          <Text style={styles.amountValue}>{formatAmount(payout.requested_amount || 0)}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={[styles.amountLabel, { color: LogoColors.status.error }]}>Commission (÷31):</Text>
          <Text style={[styles.amountValue, { color: LogoColors.status.error }]}>
            -{formatAmount(calculateCommission(payout.requested_amount || 0))}
          </Text>
        </View>
        <View style={[styles.amountRow, styles.netAmountRow]}>
          <Text style={styles.netAmountLabel}>Net Amount:</Text>
          <Text style={styles.netAmountValue}>
            {formatAmount(calculateNetAmount(payout.requested_amount || 0))}
          </Text>
        </View>
      </View>

      {payout.rejection_reason && (
        <View style={styles.rejectionReason}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={LogoColors.status.error} />
          <Text style={styles.rejectionText}>{payout.rejection_reason}</Text>
        </View>
      )}

      {payout.status === 'paid' && payout.paid_on && (
        <View style={styles.paidInfo}>
          <MaterialCommunityIcons name="check-circle" size={16} color={LogoColors.status.success} />
          <Text style={styles.paidText}>Paid on {formatDate(payout.paid_on)}</Text>
        </View>
      )}
    </View>
  );

  if (loading && payouts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={LogoColors.primary.red} />
        <Text style={styles.loadingText}>Loading payout history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Payout History</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <MaterialCommunityIcons name="filter" size={20} color={LogoColors.primary.red} />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
            <MaterialCommunityIcons 
              name="refresh" 
              size={24} 
              color={refreshing ? LogoColors.text.secondary : LogoColors.primary.red} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.summaryContainer}
        contentContainerStyle={styles.summaryContent}
      >
        <View style={[styles.summaryCard, { backgroundColor: LogoColors.primary.blue + '10' }]}>
          <MaterialCommunityIcons name="cash-multiple" size={24} color={LogoColors.primary.blue} />
          <Text style={styles.summaryValue}>{formatAmount(stats.totalRequested)}</Text>
          <Text style={styles.summaryLabel}>Total Requested</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: LogoColors.status.warning + '10' }]}>
          <MaterialCommunityIcons name="clock-outline" size={24} color={LogoColors.status.warning} />
          <Text style={styles.summaryValue}>{stats.pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: LogoColors.status.success + '10' }]}>
          <MaterialCommunityIcons name="check-circle" size={24} color={LogoColors.status.success} />
          <Text style={styles.summaryValue}>{stats.approvedCount}</Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: LogoColors.primary.red + '10' }]}>
          <MaterialCommunityIcons name="cash-check" size={24} color={LogoColors.primary.red} />
          <Text style={styles.summaryValue}>{stats.paidCount}</Text>
          <Text style={styles.summaryLabel}>Paid</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: LogoColors.status.error + '10' }]}>
          <MaterialCommunityIcons name="close-circle" size={24} color={LogoColors.status.error} />
          <Text style={styles.summaryValue}>{stats.rejectedCount}</Text>
          <Text style={styles.summaryLabel}>Rejected</Text>
        </View>
      </ScrollView>

      {/* Commission Info */}
      <View style={styles.commissionInfo}>
        <MaterialCommunityIcons name="information" size={20} color={LogoColors.primary.blue} />
        <Text style={styles.commissionText}>
          Commission: 3.23% (1/31) deducted from all payout requests
        </Text>
      </View>

      {/* Payout List */}
      <ScrollView
        style={styles.payoutsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredPayouts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cash-off" size={64} color={LogoColors.text.light} />
            <Text style={styles.emptyTitle}>
              {payouts.length === 0 ? 'No Payout Requests' : 'No Matching Payouts'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {payouts.length === 0 
                ? 'Your payout requests will appear here once you submit them'
                : 'Try adjusting your filters to see more results'
              }
            </Text>
          </View>
        ) : (
          [...filteredPayouts]
            .sort((a, b) => new Date(b.requested_on).getTime() - new Date(a.requested_on).getTime())
            .map(renderPayoutCard)
        )}
      </ScrollView>
      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LogoColors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 0,
    backgroundColor: LogoColors.background.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: LogoColors.text.secondary,
  },
  summaryContainer: {
    maxHeight: 120,
  },
  summaryContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryCard: {
    width: 140,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: LogoColors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  commissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LogoColors.primary.blue + '10',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  commissionText: {
    fontSize: 12,
    color: LogoColors.primary.blue,
    marginLeft: 8,
    flex: 1,
  },
  payoutsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  payoutCard: {
    backgroundColor: LogoColors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: LogoColors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  amountBreakdown: {
    borderTopWidth: 1,
    borderTopColor: LogoColors.border.light,
    paddingTop: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: LogoColors.text.secondary,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: LogoColors.text.primary,
  },
  netAmountRow: {
    borderTopWidth: 1,
    borderTopColor: LogoColors.border.light,
    paddingTop: 8,
    marginTop: 4,
  },
  netAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
  },
  netAmountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LogoColors.status.success,
  },
  rejectionReason: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LogoColors.status.error + '10',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  rejectionText: {
    fontSize: 12,
    color: LogoColors.status.error,
    marginLeft: 8,
    flex: 1,
  },
  paidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LogoColors.status.success + '10',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  paidText: {
    fontSize: 12,
    color: LogoColors.status.success,
    marginLeft: 8,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: LogoColors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: LogoColors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LogoColors.primary.red + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterButtonText: {
    fontSize: 12,
    color: LogoColors.primary.red,
    marginLeft: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: LogoColors.background.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: LogoColors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: LogoColors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  filterChipActive: {
    backgroundColor: LogoColors.primary.red,
    borderColor: LogoColors.primary.red,
  },
  filterChipText: {
    fontSize: 12,
    color: LogoColors.text.secondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: LogoColors.background.surface,
  },
  applyButton: {
    backgroundColor: LogoColors.primary.red,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    color: LogoColors.background.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PayoutsScreen;