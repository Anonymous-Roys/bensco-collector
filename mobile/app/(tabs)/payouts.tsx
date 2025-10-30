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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { Colors } from '@/constants/Colors';
import { RootState, AppDispatch } from '@/store';
import { fetchPayouts } from '@/store/slices/payoutSlice';
import { PayoutRequest } from '@/constants/types';

const PayoutsScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { payouts, loading, error } = useSelector((state: RootState) => state.payouts);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      await dispatch(fetchPayouts()).unwrap();
    } catch (error) {
      console.error('Failed to load payouts:', error);
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
      case 'pending': return Colors.light.status.warning;
      case 'approved': return Colors.light.status.success;
      case 'paid': return Colors.light.primary.blue;
      case 'rejected': return Colors.light.status.error;
      case 'auto_rejected': return Colors.light.status.error;
      default: return Colors.light.text.secondary;
    }
  };

  const formatAmount = (amount: number) => `₵${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateCommission = (amount: number) => amount / 31;
  const calculateNetAmount = (amount: number) => amount - calculateCommission(amount);

  const getSummaryStats = () => {
    const totalRequested = payouts.reduce((sum, p) => sum + (p.requested_amount || 0), 0);
    const totalCommission = payouts.reduce((sum, p) => sum + calculateCommission(p.requested_amount || 0), 0);
    const totalNet = payouts.reduce((sum, p) => sum + calculateNetAmount(p.requested_amount || 0), 0);
    const pendingCount = payouts.filter(p => p.status === 'pending').length;
    const paidCount = payouts.filter(p => p.status === 'paid').length;

    return { totalRequested, totalCommission, totalNet, pendingCount, paidCount };
  };

  const stats = getSummaryStats();

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
          <Text style={[styles.amountLabel, { color: Colors.light.status.error }]}>Commission (÷31):</Text>
          <Text style={[styles.amountValue, { color: Colors.light.status.error }]}>
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
          <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.light.status.error} />
          <Text style={styles.rejectionText}>{payout.rejection_reason}</Text>
        </View>
      )}

      {payout.status === 'paid' && payout.paid_on && (
        <View style={styles.paidInfo}>
          <MaterialCommunityIcons name="check-circle" size={16} color={Colors.light.status.success} />
          <Text style={styles.paidText}>Paid on {formatDate(payout.paid_on)}</Text>
        </View>
      )}
    </View>
  );

  if (loading && payouts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary.red} />
        <Text style={styles.loadingText}>Loading payout history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Payout History</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <MaterialCommunityIcons 
            name="refresh" 
            size={24} 
            color={refreshing ? Colors.light.text.secondary : Colors.light.primary.red} 
          />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.summaryContainer}
        contentContainerStyle={styles.summaryContent}
      >
        <View style={[styles.summaryCard, { backgroundColor: Colors.light.primary.blue + '10' }]}>
          <MaterialCommunityIcons name="cash-multiple" size={24} color={Colors.light.primary.blue} />
          <Text style={styles.summaryValue}>{formatAmount(stats.totalRequested)}</Text>
          <Text style={styles.summaryLabel}>Total Requested</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: Colors.light.status.error + '10' }]}>
          <MaterialCommunityIcons name="percent" size={24} color={Colors.light.status.error} />
          <Text style={styles.summaryValue}>{formatAmount(stats.totalCommission)}</Text>
          <Text style={styles.summaryLabel}>Total Commission</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: Colors.light.status.success + '10' }]}>
          <MaterialCommunityIcons name="wallet" size={24} color={Colors.light.status.success} />
          <Text style={styles.summaryValue}>{formatAmount(stats.totalNet)}</Text>
          <Text style={styles.summaryLabel}>Net Received</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: Colors.light.status.warning + '10' }]}>
          <MaterialCommunityIcons name="clock-outline" size={24} color={Colors.light.status.warning} />
          <Text style={styles.summaryValue}>{stats.pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
      </ScrollView>

      {/* Commission Info */}
      <View style={styles.commissionInfo}>
        <MaterialCommunityIcons name="information" size={20} color={Colors.light.primary.blue} />
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
        {payouts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cash-off" size={64} color={Colors.light.text.light} />
            <Text style={styles.emptyTitle}>No Payout Requests</Text>
            <Text style={styles.emptySubtitle}>
              Your payout requests will appear here once you submit them
            </Text>
          </View>
        ) : (
          payouts
            .sort((a, b) => new Date(b.requested_on).getTime() - new Date(a.requested_on).getTime())
            .map(renderPayoutCard)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.light.background.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.text.secondary,
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
    color: Colors.light.text.primary,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.light.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  commissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary.blue + '10',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  commissionText: {
    fontSize: 12,
    color: Colors.light.primary.blue,
    marginLeft: 8,
    flex: 1,
  },
  payoutsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  payoutCard: {
    backgroundColor: Colors.light.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border.light,
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
    color: Colors.light.text.primary,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: Colors.light.text.secondary,
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
    borderTopColor: Colors.light.border.light,
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
    color: Colors.light.text.secondary,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text.primary,
  },
  netAmountRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border.light,
    paddingTop: 8,
    marginTop: 4,
  },
  netAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text.primary,
  },
  netAmountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.status.success,
  },
  rejectionReason: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.status.error + '10',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  rejectionText: {
    fontSize: 12,
    color: Colors.light.status.error,
    marginLeft: 8,
    flex: 1,
  },
  paidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.status.success + '10',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  paidText: {
    fontSize: 12,
    color: Colors.light.status.success,
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
    color: Colors.light.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PayoutsScreen;