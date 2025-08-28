import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { LogoColors } from '@/constants/Colors';
import { Client } from '@/constants/types';

interface CollectionModalProps {
    client: Client | string |null;
    amount: string;
    onAmountChange: (amount: string) => void;
    onCollect: () => void;
    onClose: () => void;
    manualClientName?: string;
    loading?: boolean;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
    client,
    amount,
    onAmountChange,
    onCollect,
    onClose,
    manualClientName,
    loading = false
}) => {
    const getClientName = () => {
        if (typeof client === 'object' && client !== null && 'name' in client) {
            return client.name;
        }
        return manualClientName || (typeof client === 'string' ? client : 'Client');
    };

    const getDailyAmount = () => {
        if (typeof client === 'object' && client !== null && 'amount_daily' in client) {
            return parseFloat(client.amount_daily);
        }
        return 0;
    };

    const dailyAmount = getDailyAmount();

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.quickCollectModal}>
                <Text style={styles.quickCollectTitle}>Quick Collection</Text>
                {client && (
                    <Text style={styles.quickCollectSubtitle}>
                        Collecting from {getClientName()}
                    </Text>
                )}

                <View style={styles.amountInput}>
                    <Text style={styles.currencySymbol}>Amount Collected (GHS)</Text>
                    <TextInput
                        style={styles.amountTextInput}
                        value={amount}
                        onChangeText={onAmountChange}
                        placeholder="0.00"
                        keyboardType="numeric"
                        autoFocus
                    />
                </View>

                {dailyAmount > 0 && (
                    <View style={styles.quickAmounts}>
                        <Text style={styles.quickAmountsTitle}>Quick Amounts</Text>
                        <View style={styles.quickAmountButtons}>
                        {[
                            dailyAmount,
                            dailyAmount * 2,
                            dailyAmount * 5,
                            100
                        ].map((amount) => (
                            <TouchableOpacity
                                key={amount}
                                style={styles.quickAmountBtn}
                                onPress={() => onAmountChange(amount.toString())}
                            >
                                <Text style={styles.quickAmountText}>
                                    GHS {amount}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    </View>
                )}

                <View style={styles.modalActions}>
                    <TouchableOpacity
                        style={[styles.modalActionBtn, styles.cancelBtn]}
                        onPress={onClose}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.modalActionBtn, styles.collectBtn, loading && styles.disabledBtn]}
                        onPress={onCollect}
                        disabled={loading}
                    >
                        <Text style={styles.collectBtnText}>
                            {loading ? 'Collecting...' : 'Collect'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickCollectModal: {
        backgroundColor: LogoColors.background.surface,
        borderRadius: 16,
        width: '90%',
        padding: 24,
    },
    quickCollectTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: LogoColors.text.primary,
        marginBottom: 4,
        textAlign: 'center',
    },
    quickCollectSubtitle: {
        fontSize: 16,
        color: LogoColors.text.secondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    amountInput: {
        marginBottom: 24,
    },
    currencySymbol: {
        fontSize: 14,
        color: LogoColors.text.secondary,
        marginBottom: 8,
    },
    amountTextInput: {
        fontSize: 32,
        fontWeight: 'bold',
        color: LogoColors.text.primary,
        borderBottomWidth: 1,
        borderBottomColor: LogoColors.border.medium,
        paddingVertical: 8,
    },
    quickAmounts: {
     marginBottom: 24,
    },

    quickAmountsTitle: {
    fontSize: 14,
    color: LogoColors.text.secondary,
    marginBottom: 8,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
    quickAmountBtn: {
        width: '48%',
        backgroundColor: LogoColors.background.secondary,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
    },
    quickAmountText: {
        fontSize: 14,
        fontWeight: '500',
        color: LogoColors.text.primary,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalActionBtn: {
        flex: 1,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: LogoColors.background.secondary,
        marginRight: 12,
    },
    collectBtn: {
        backgroundColor: LogoColors.primary.red,
    },
    cancelBtnText: {
        color: LogoColors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    collectBtnText: {
        color: LogoColors.text.onPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    disabledBtn: {
        opacity: 0.6,
    },
});