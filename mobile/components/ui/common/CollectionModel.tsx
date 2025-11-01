import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    Alert, 
    KeyboardAvoidingView, 
    Platform,
    Keyboard,
    ScrollView,
    Dimensions
} from 'react-native';
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
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const screenHeight = Dimensions.get('window').height;

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            (e) => {
                setKeyboardVisible(true);
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardDidHideListener?.remove();
            keyboardDidShowListener?.remove();
        };
    }, []);

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

    const isFixedClient = () => {
        if (typeof client === 'object' && client !== null && 'is_fixed' in client) {
            return client.is_fixed;
        }
        return false;
    };

    const dailyAmount = getDailyAmount();
    const fixedClient = isFixedClient();

    const handleCollectWithConfirmation = () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount');
            return;
        }

        // Validate fixed client amounts
        if (fixedClient && dailyAmount > 0) {
            const collectedAmount = parseFloat(amount);
            if (collectedAmount % dailyAmount !== 0) {
                const remainder = collectedAmount % dailyAmount;
                Alert.alert(
                    'Invalid Amount for Fixed Client',
                    `Amount GHS ${collectedAmount.toFixed(2)} is not divisible by daily amount GHS ${dailyAmount.toFixed(2)}. Excess: GHS ${remainder.toFixed(2)}.\n\nFixed clients must pay exact multiples of their daily amount for spreading to work properly.`,
                    [{ text: 'OK' }]
                );
                return;
            }
            
            if (collectedAmount < dailyAmount) {
                Alert.alert(
                    'Amount Too Low',
                    `Amount GHS ${collectedAmount.toFixed(2)} is less than required daily amount of GHS ${dailyAmount.toFixed(2)}.`,
                    [{ text: 'OK' }]
                );
                return;
            }
        }

        Alert.alert(
            'Confirm Collection',
            `Collect GHS ${amount} from ${getClientName()}?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Collect',
                    onPress: onCollect
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <ScrollView 
                contentContainerStyle={[
                    styles.scrollContainer,
                    keyboardVisible && {
                        paddingBottom: keyboardHeight + 20,
                        justifyContent: 'flex-start',
                        paddingTop: Math.max(50, (screenHeight - keyboardHeight - 400) / 2)
                    }
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={[
                    styles.quickCollectModal,
                    keyboardVisible && styles.quickCollectModalKeyboard
                ]}>
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
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                        />
                        {fixedClient && dailyAmount > 0 && amount && (
                            <View style={styles.validationInfo}>
                                {parseFloat(amount) % dailyAmount === 0 && parseFloat(amount) >= dailyAmount ? (
                                    <Text style={styles.validationSuccess}>
                                        ✓ Valid: Covers {Math.floor(parseFloat(amount) / dailyAmount)} days
                                    </Text>
                                ) : (
                                    <Text style={styles.validationError}>
                                        ⚠ Must be multiple of GHS {dailyAmount.toFixed(2)} (daily amount)
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {dailyAmount > 0 && !keyboardVisible && (
                        <View style={styles.quickAmounts}>
                            <Text style={styles.quickAmountsTitle}>Quick Amounts</Text>
                            <View style={styles.quickAmountButtons}>
                            {[
                                dailyAmount,
                                dailyAmount * 2,
                                dailyAmount * 5,
                                dailyAmount * 7
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
                            onPress={handleCollectWithConfirmation}
                            disabled={loading}
                        >
                            <Text style={styles.collectBtnText}>
                                {loading ? 'Collecting...' : 'Collect'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    quickCollectModal: {
        backgroundColor: LogoColors.background.surface,
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        padding: 24,
    },
    quickCollectModalKeyboard: {
        marginTop: 0,
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
    validationInfo: {
        marginTop: 8,
    },
    validationSuccess: {
        fontSize: 12,
        color: LogoColors.status.success,
        fontWeight: '500',
    },
    validationError: {
        fontSize: 12,
        color: LogoColors.status.error,
        fontWeight: '500',
    },
});
