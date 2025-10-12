import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { Colors } from '@/constants/Colors';
import { Client, ClientBalance } from '@/constants/types';
import { RootState, AppDispatch } from '@/store';
import { fetchClientBalance, requestClientPayout, clearError } from '@/store/slices/payoutSlice';
import { ClientCycleCard } from './ClientCycleCard';

interface PayoutRequestModalProps {
  visible: boolean;
  client: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}



export const PayoutRequestModal: React.FC<PayoutRequestModalProps> = ({
  visible,
  client,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { clientBalances, loading, submitting, error } = useSelector((state: RootState) => state.payouts);
  const [requestedAmount, setRequestedAmount] = useState('');
  
  const clientBalance = client ? clientBalances[client.id] : null;

  useEffect(() => {
    if (visible && client) {
      fetchBalance();
    } else {
      resetForm();
    }
  }, [visible, client]);
  
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const resetForm = () => {
    setRequestedAmount('');
  };

  const fetchBalance = async () => {
    if (!client) return;
    
    try {
      await dispatch(fetchClientBalance(client.id)).unwrap();
    } catch (error) {
      console.error('Failed to fetch client balance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch client balance';
      Alert.alert('Error', `Failed to fetch client balance: ${errorMessage}`);
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!client || !clientBalance) return;

    const amount = parseFloat(requestedAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Show warning if amount > available balance (will be auto-rejected)
    if (amount > clientBalance.available_balance) {
      Alert.alert(
        'Invalid Request',
        `Requested amount (₵${amount}) exceeds available balance (₵${clientBalance.available_balance.toFixed(2)}). This request will be automatically rejected.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', onPress: () => submitRequest(amount) }
        ]
      );
      return;
    }
    
    submitRequest(amount);
  };
  
  const submitRequest = async (amount: number) => {

    try {
      await dispatch(requestClientPayout({ clientId: client.id, requestedAmount: amount })).unwrap();
      Alert.alert(
        'Success',
        'Payout request submitted successfully',
        [{ text: 'OK', onPress: () => { onSuccess(); onClose(); } }]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit payout request');
    }
  };

  const getCommissionInfo = () => {
    if (!clientBalance?.current_cycle) return null;

    const { is_fixed, daily_amount, current_cycle } = clientBalance;
    
    if (is_fixed) {
      return `Fixed commission: ₵${daily_amount} (once per cycle)`;
    } else {
      const avgDaily = current_cycle.contributing_days > 0 
        ? current_cycle.total_collected / current_cycle.contributing_days 
        : 0;
      return `Variable commission: ₵${avgDaily.toFixed(2)} (avg daily rate)`;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.light.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Request Payout</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary.red} />
              <Text style={styles.loadingText}>Loading client balance...</Text>
            </View>
          ) : clientBalance ? (
            <>
              {/* Client Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Client Information</Text>
                <View style={styles.infoCard}>
                  <Text style={styles.clientName}>{clientBalance.client_name}</Text>
                  <Text style={styles.clientType}>
                    {clientBalance.is_fixed ? 'Fixed Client' : 'Variable Client'}
                  </Text>
                  {clientBalance.is_fixed && (
                    <Text style={styles.dailyAmount}>
                      Daily Amount: ₵{clientBalance.daily_amount}
                    </Text>
                  )}
                </View>
              </View>

              {/* Cycle Tracking */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cycle Information</Text>
                <ClientCycleCard client={client} onCycleUpdate={fetchBalance} />
              </View>

              {/* Available Balance */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Balance</Text>
                <View style={[styles.infoCard, styles.balanceCard]}>
                  <Text style={styles.balanceAmount}>₵{clientBalance.available_balance.toFixed(2)}</Text>
                  <Text style={styles.balanceNote}>
                    Amount available for payout after deducting commission
                  </Text>
                </View>
              </View>

              {/* Withdrawal Amount Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Withdrawal Amount</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>₵</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={requestedAmount}
                    onChangeText={setRequestedAmount}
                    placeholder="0.00"
                    keyboardType="numeric"
                    editable={!submitting}
                  />
                  <TouchableOpacity 
                    style={styles.maxButton}
                    onPress={() => setRequestedAmount(clientBalance.available_balance.toFixed(2))}
                    disabled={submitting}
                  >
                    <Text style={styles.maxButtonText}>MAX</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputNote}>
                  Available balance: ₵{clientBalance.available_balance.toFixed(2)}. Amounts exceeding this will be auto-rejected.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.light.text.onPrimary} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cash" size={20} color={Colors.light.text.onPrimary} />
                    <Text style={styles.submitButtonText}>Request Payout</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.light.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border.light,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text.primary,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: Colors.light.background.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border.light,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text.primary,
    marginBottom: 4,
  },
  clientType: {
    fontSize: 14,
    color: Colors.light.text.secondary,
    marginBottom: 4,
  },
  dailyAmount: {
    fontSize: 14,
    color: Colors.light.primary.red,
    fontWeight: '500',
  },
  cycleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cycleLabel: {
    fontSize: 14,
    color: Colors.light.text.secondary,
  },
  cycleValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text.primary,
  },
  commissionInfo: {
    fontSize: 12,
    color: Colors.light.text.light,
    fontStyle: 'italic',
    marginTop: 8,
  },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: Colors.light.status.success + '10',
    borderColor: Colors.light.status.success,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.status.success,
    marginBottom: 4,
  },
  balanceNote: {
    fontSize: 12,
    color: Colors.light.text.secondary,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border.light,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    color: Colors.light.text.primary,
    paddingVertical: 16,
  },
  maxButton: {
    backgroundColor: Colors.light.primary.red,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  maxButtonText: {
    color: Colors.light.text.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputNote: {
    fontSize: 12,
    color: Colors.light.text.secondary,
    marginTop: 8,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: Colors.light.primary.red,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 60,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.light.text.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});