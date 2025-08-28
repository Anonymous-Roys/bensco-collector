// app/(tabs)/collect/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';
import { Client } from '@/constants/types';
import { CollectionModal } from '@/components/ui/common/CollectionModel';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchClients } from '@/store/slices/clientSlice';
// import { createContribution } from '@/store/slices/contributionSlice';
import { confirmAndCreateContribution } from '@/services/collections';

export default function CollectScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { clients, loading, error } = useSelector((state: RootState) => state.clients);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [manualClientName, setManualClientName] = useState('');

  // Load clients on mount
  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  // Keep default list in results when not searching
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(Array.isArray(clients) ? clients : []);
    }
  }, [clients, searchQuery]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery);
      } else {
        setSearchResults(Array.isArray(clients) ? clients : []);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, clients]);

  const performSearch = (query: string) => {
    try {
      setIsSearching(true);
      const source = Array.isArray(clients) ? clients : [];
      const results = source.filter((client) => {
        const nameMatch = client.name.toLowerCase().includes(query.toLowerCase());
        const phone = client.phone_number || '';
        const phoneMatch = phone.includes(query);
        return nameMatch || phoneMatch;
      });
      setSearchResults(results);
    } catch (e) {
      Alert.alert('Error', 'Failed to search clients');
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickCollect = async () => {
    if (!selectedClient || !collectAmount) return;

    const amount = parseFloat(collectAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      const contributionData = {
        client: selectedClient.id,
        collector: selectedClient.collector,
        savings_cycle: 'default-cycle',
        amount: amount.toString(),
        date: new Date().toISOString().split('T')[0],
        note: `Quick collection from ${selectedClient.name}`,
      };

      const ok = await confirmAndCreateContribution(dispatch, contributionData, {
        confirm: true,
        confirmTitle: 'Confirm Collection',
        confirmMessage: `Add GHS ${amount.toFixed(2)} for ${selectedClient.name} to the database?`,
      });

      if (ok) {
        Alert.alert('Success', `Collected GHS ${amount} from ${selectedClient.name}`);
        setShowCollectModal(false);
        setCollectAmount('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create contribution. Please try again.');
    }
  };

  // Temporary status coloring (backend doesn't provide status)
  const getStatusColor = (_status?: string) => {
    return LogoColors.status.success;
  };

  const renderSearchResultItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => {
        setSelectedClient(item);
        setSearchQuery(item.name);
        setSearchResults([]);
      }}
    >
      <View style={[styles.avatar, { backgroundColor: getStatusColor('active') }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.resultText}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultPhone}>{item.phone_number || ''}</Text>
      </View>
      <MaterialCommunityIcons 
        name="chevron-right" 
        size={24} 
        color={LogoColors.text.secondary} 
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Record Collection</Text>
        <Text style={styles.headerSubtitle}>
          Search for client or enter manually
        </Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons 
            name="magnify" 
            size={20} 
            color={LogoColors.text.secondary} 
            style={styles.searchIcon} 
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search client name or phone..."
            placeholderTextColor={LogoColors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {(isSearching || loading) && <ActivityIndicator size="small" color={LogoColors.primary.red} />}
        </View>

        {/* Search Results */}
        {Array.isArray(searchResults) && searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              renderItem={renderSearchResultItem}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Manual Entry Option */}
        {searchQuery.length > 0 && searchResults.length === 0 && !isSearching && (
          <TouchableOpacity
            style={styles.manualEntry}
            onPress={() => {
              setManualClientName(searchQuery);
              setSelectedClient(null);
              setSearchResults([]);
            }}
          >
            <Text style={styles.manualEntryText}>
              Continue with &quot;{searchQuery}&quot; as client name
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selected Client Info */}
      {(selectedClient || manualClientName) && (
        <View style={styles.selectedClientCard}>
          <View style={styles.clientHeader}>
            {selectedClient ? (
              <>
                <View style={[styles.largeAvatar, { backgroundColor: getStatusColor('active') }]}>
                  <Text style={styles.largeAvatarText}>
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{selectedClient.name}</Text>
                  <Text style={styles.clientPhone}>{selectedClient.phone_number || ''}</Text>
                  {selectedClient.address && (
                    <Text style={styles.clientAddress}>{selectedClient.address}</Text>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.largeAvatar}>
                  <MaterialCommunityIcons 
                    name="account-plus" 
                    size={28} 
                    color={LogoColors.text.secondary} 
                  />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{manualClientName}</Text>
                  <Text style={styles.clientPhone}>New collection</Text>
                </View>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.collectButton}
            onPress={() => setShowCollectModal(true)}
          >
            <Text style={styles.collectButtonText}>Record Collection</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Collection Modal */}
      <Modal
              visible={showCollectModal}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowCollectModal(false)}
            >
              <CollectionModal
                // client={selectedClient || manualClientName || 'Client'}
                client={selectedClient}
                amount={collectAmount}
                onAmountChange={setCollectAmount}
                onCollect={handleQuickCollect}
                onClose={() => {
                  setShowCollectModal(false);
                  setCollectAmount('');
                }}
              />
            </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

const WINDOW_HEIGHT = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LogoColors.background.primary,

  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: LogoColors.text.secondary,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LogoColors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: LogoColors.text.primary,
  },
  resultsContainer: {
    maxHeight: WINDOW_HEIGHT * 0.6,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: LogoColors.background.surface,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: LogoColors.border.light,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: LogoColors.text.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
    marginBottom: 2,
  },
  resultPhone: {
    fontSize: 14,
    color: LogoColors.text.secondary,
  },
  manualEntry: {
    padding: 16,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: LogoColors.background.secondary,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  manualEntryText: {
    fontSize: 16,
    color: LogoColors.text.primary,
    textAlign: 'center',
  },
  selectedClientCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: LogoColors.background.surface,
    borderWidth: 1,
    borderColor: LogoColors.border.light,

  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  largeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: LogoColors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  largeAvatarText: {
    color: LogoColors.text.onPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  clientInfo: {
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
  clientAddress: {
    fontSize: 14,
    color: LogoColors.text.light,
  },
  collectButton: {
    backgroundColor: LogoColors.primary.red,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  collectButtonText: {
    color: LogoColors.text.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  collectModal: {
    width: '100%',
    backgroundColor: LogoColors.background.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: LogoColors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  amountSection: {
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: LogoColors.text.secondary,
    marginBottom: 8,
  },
  amountInput: {
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
  quickAmountButton: {
    width: '48%',
    backgroundColor: LogoColors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: '500',
    color: LogoColors.text.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: LogoColors.background.secondary,
    marginRight: 12,
  },
  confirmButton: {
    backgroundColor: LogoColors.primary.red,
  },
  cancelButtonText: {
    color: LogoColors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: LogoColors.text.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});