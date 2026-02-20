import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchClients, clearError } from '@/store/slices/clientSlice';
import { createContribution } from '@/store/slices/contributionSlice';
import { LogoColors } from '@/constants/Colors';
import { Client } from '@/constants/types';
import { ClientCard } from '@/components/ui/common/ClientCard';
import { ClientInfoModal } from '@/components/ui/common/ClientInfoModal';
import { CollectionModal } from '@/components/ui/common/CollectionModel';
import { PayoutRequestModal } from '@/components/collector/PayoutRequestModal';

// Create Client Modal Component
const CreateClientModal = ({ visible, onClose, onSuccess }: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  
  useEffect(() => {
    if (visible) {
      fetchAddresses();
    }
  }, [visible]);
  
  const fetchAddresses = async () => {
    try {
      const response = await fetch('https://bensco-collector1.onrender.com/clients/addresses/', {
        headers: {
          'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAddresses(data);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    }
  };
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    amount_daily: '',
    is_fixed: true,
    start_date: new Date(),
    dob: null as Date | null,
    dobText: '',
    next_of_kin: '',
    initial_balance: '0',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [showCustomAddress, setShowCustomAddress] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [customRegion, setCustomRegion] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);

  // Convert DD/MM/YYYY to YYYY-MM-DD
  const convertDateFormat = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
  };

  const handleSubmit = async () => {
    // Validate required fields
    const errors = [];
    if (!formData.name.trim()) errors.push('Full name is required');
    if (!formData.phone_number.trim()) errors.push('Phone number is required');
    if (formData.is_fixed && (!formData.amount_daily || parseFloat(formData.amount_daily) <= 0)) {
      errors.push('Valid daily amount is required for fixed clients');
    }
    
    // Phone number validation (Ghana format)
    const phoneRegex = /^(\+233|0)[235]\d{8}$/;
    if (formData.phone_number && !phoneRegex.test(formData.phone_number.replace(/\s/g, ''))) {
      errors.push('Please enter a valid Ghanaian phone number');
    }
    
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    setLoading(true);
    try {
      let addressId = formData.address;
      
      // Create address if custom address is provided
      if (showCustomAddress && customAddress.trim()) {
        const addressResponse = await fetch('https://bensco-collector1.onrender.com/clients/addresses/create/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({
            label: customAddress.trim(),
            region: customRegion.trim() || null,
          }),
        });
        
        if (addressResponse.ok) {
          const address = await addressResponse.json();
          addressId = address.id;
        }
      }
      
      // Create client
      const clientData = {
        name: formData.name.trim(),
        phone_number: formData.phone_number.trim(),
        amount_daily: formData.amount_daily ? parseFloat(formData.amount_daily) : 0,
        is_fixed: formData.is_fixed,
        start_date: formData.start_date.toISOString().split('T')[0],
        dob: formData.dob ? formData.dob.toISOString().split('T')[0] : (formData.dobText ? convertDateFormat(formData.dobText) : null),
        next_of_kin: formData.next_of_kin || null,
        initial_balance: parseFloat(formData.initial_balance) || 0,
        address: addressId === 'none' ? null : addressId,
      };
      
      console.log('Creating client with data:', clientData);
      
      const response = await fetch('https://bensco-collector1.onrender.com/clients/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(clientData),
        timeout: 60000, // 60 second timeout
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Client created successfully:', result);
        
        Alert.alert('Success', 'Client created successfully!');
        setFormData({
          name: '',
          phone_number: '',
          amount_daily: '',
          is_fixed: true,
          start_date: new Date(),
          dob: null,
          dobText: '',
          next_of_kin: '',
          initial_balance: '0',
          address: '',
        });
        setShowCustomAddress(false);
        setCustomAddress('');
        setCustomRegion('');
        onSuccess();
      } else {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        Alert.alert('Error', errorData.detail || errorData.message || 'Failed to create client');
      }
    } catch (error: any) {
      console.error('Client creation error:', error);
      Alert.alert('Error', error.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Client</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={LogoColors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Enter client's full name"
              placeholderTextColor={LogoColors.text.secondary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.phone_number}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone_number: text }))}
              placeholder="+233 XX XXX XXXX"
              placeholderTextColor={LogoColors.text.secondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Daily Amount (₵) {formData.is_fixed ? '*' : '(Optional)'}</Text>
            <TextInput
              style={styles.input}
              value={formData.amount_daily}
              onChangeText={(text) => setFormData(prev => ({ ...prev, amount_daily: text }))}
              placeholder={formData.is_fixed ? "0.00" : "Leave empty for variable amounts"}
              placeholderTextColor={LogoColors.text.secondary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Initial Balance (₵)</Text>
            <TextInput
              style={styles.input}
              value={formData.initial_balance}
              onChangeText={(text) => setFormData(prev => ({ ...prev, initial_balance: text }))}
              placeholder="0.00"
              placeholderTextColor={LogoColors.text.secondary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Start Date *</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formData.start_date.toLocaleDateString()}
              </Text>
              <MaterialCommunityIcons name="calendar" size={20} color={LogoColors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            {!showCustomAddress ? (
              <View>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => {
                    // Show address picker
                  }}
                >
                  <Text style={styles.dropdownText}>
                    {formData.address ? 
                      addresses.find(a => a.id === formData.address)?.label || 'Select address' : 
                      'Select address'
                    }
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={LogoColors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.addNewButton}
                  onPress={() => setShowCustomAddress(true)}
                >
                  <MaterialCommunityIcons name="plus" size={16} color={LogoColors.primary.red} />
                  <Text style={styles.addNewText}>Add new address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.customAddressContainer}>
                <TextInput
                  style={styles.input}
                  value={customAddress}
                  onChangeText={setCustomAddress}
                  placeholder="Address label (e.g., Kasoa New Market)"
                  placeholderTextColor={LogoColors.text.secondary}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={customRegion}
                  onChangeText={setCustomRegion}
                  placeholder="Region (optional)"
                  placeholderTextColor={LogoColors.text.secondary}
                />
                <TouchableOpacity 
                  style={styles.cancelCustomButton}
                  onPress={() => {
                    setShowCustomAddress(false);
                    setCustomAddress('');
                    setCustomRegion('');
                  }}
                >
                  <Text style={styles.cancelCustomText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <View style={styles.dobContainer}>
              <TextInput
                style={[styles.input, styles.dobInput]}
                value={formData.dobText}
                onChangeText={(text) => setFormData(prev => ({ ...prev, dobText: text, dob: null }))}
                placeholder="DD/MM/YYYY or text format"
                placeholderTextColor={LogoColors.text.secondary}
              />
              <TouchableOpacity 
                style={styles.calendarButton}
                onPress={() => setShowDobPicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color={LogoColors.primary.red} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Next of Kin</Text>
            <TextInput
              style={styles.input}
              value={formData.next_of_kin}
              onChangeText={(text) => setFormData(prev => ({ ...prev, next_of_kin: text }))}
              placeholder="Next of kin name and contact"
              placeholderTextColor={LogoColors.text.secondary}
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.label}>Amount Type</Text>
            <TouchableOpacity
              style={styles.switchContainer}
              onPress={() => setFormData(prev => ({ ...prev, is_fixed: !prev.is_fixed }))}
            >
              <Text style={styles.switchText}>
                {formData.is_fixed ? 'Fixed Amount' : 'Variable Amount'}
              </Text>
              <MaterialCommunityIcons 
                name={formData.is_fixed ? 'toggle-switch' : 'toggle-switch-off'} 
                size={32} 
                color={formData.is_fixed ? LogoColors.primary.red : LogoColors.text.secondary} 
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.submitButton]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating...' : 'Create Client'}
            </Text>
          </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        
        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={formData.start_date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setFormData(prev => ({ ...prev, start_date: selectedDate }));
              }
            }}
          />
        )}
        
        {showDobPicker && (
          <DateTimePicker
            value={formData.dob || new Date(2000, 0, 1)}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDobPicker(false);
              if (selectedDate) {
                setFormData(prev => ({ 
                  ...prev, 
                  dob: selectedDate,
                  dobText: selectedDate.toLocaleDateString()
                }));
              }
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default function ClientsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { clients, loading, loadingMore, error, totalCount, currentPage, hasNextPage } = useSelector((state: RootState) => state.clients);
  const { loading: contributionLoading } = useSelector((state: RootState) => state.contributions);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'pending' | 'complete'>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showQuickCollectModal, setShowQuickCollectModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'amount' | 'date'>('name');
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch clients on component mount and when debounced search changes
  useEffect(() => {
    dispatch(fetchClients({ 
      search: debouncedSearchQuery.trim() || undefined,
      page: 1
    }));
  }, [dispatch, debouncedSearchQuery]);

  // Load more clients when scrolling
  const loadMoreClients = useCallback(() => {
    if (!loadingMore && hasNextPage && !loading) {
      dispatch(fetchClients({ 
        search: debouncedSearchQuery.trim() || undefined,
        page: currentPage + 1,
        loadMore: true
      }));
    }
  }, [dispatch, debouncedSearchQuery, currentPage, hasNextPage, loadingMore, loading]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Sort clients (filtering is now done server-side)
  const sortedClients = useMemo(() => {
    if (!clients || !Array.isArray(clients)) {
      return [];
    }
    
    return clients
      .filter(client => {
        // For now, we'll show all clients as active since the backend doesn't provide status
        const matchesFilter = selectedFilter === 'all' || selectedFilter === 'active';
        return matchesFilter;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'status':
            return 0; // No status in backend data for now
          case 'amount':
            return parseFloat(b.amount_daily) - parseFloat(a.amount_daily);
          case 'date':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          default:
            return 0;
        }
      });
  }, [clients, selectedFilter, sortBy]);

  // Handle quick collect
  const handleQuickCollect = async () => {
    if (!selectedClient || !collectAmount) return;

    const amount = parseFloat(collectAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      // Create contribution data
      const contributionData = {
        client: selectedClient.id,
        collector: selectedClient.collector,
        savings_cycle: 'default-cycle', // You might want to get this from user context or API
        amount: amount.toString(),
        date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        note: `Quick collection from ${selectedClient.name}`,
      };

      await dispatch(createContribution(contributionData));
      Alert.alert('Success', `Collected GHS ${amount} from ${selectedClient.name}`);
      setShowQuickCollectModal(false);
      setCollectAmount('');
    } catch (error) {
      Alert.alert('Error', 'Failed to create contribution. Please try again.');
    }
  };

  // Handle payout request
  const handleRequestPayout = (client: Client) => {
    setSelectedClient(client);
    setShowPayoutModal(true);
  };
  
  const handlePayoutSuccess = () => {
    // Refresh clients list after successful payout request
    dispatch(fetchClients());
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchClients({ 
        search: debouncedSearchQuery.trim() || undefined,
        page: 1
      }));
    } catch (error) {
      console.error('Error refreshing clients:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter Buttons
  const FilterButton = ({ filter, title }: { filter: typeof selectedFilter, title: string }) => (
    <TouchableOpacity
      style={[
        styles.filterBtn,
        selectedFilter === filter && styles.activeFilterBtn
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterBtnText,
        selectedFilter === filter && styles.activeFilterBtnText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  // Show error if any
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color={LogoColors.status.error} />
          <Text style={styles.errorText}>Error loading clients</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => dispatch(fetchClients())}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>My Clients</Text>
            <Text style={styles.headerSubtitle}>
              {totalCount} client{totalCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowCreateClientModal(true)}
          >
            <MaterialCommunityIcons name="plus" size={24} color={LogoColors.text.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={LogoColors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={LogoColors.text.secondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close" size={20} color={LogoColors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <FilterButton filter="all" title="All" />
        <FilterButton filter="active" title="Active" />
        {/* Removed any potential stray dots */}
      </ScrollView>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'name', label: 'Name' },
            { key: 'amount', label: 'Daily Amount' },
            { key: 'date', label: 'Created Date' },
          ].map((sort) => (
            <TouchableOpacity
              key={sort.key}
              style={[
                styles.sortBtn,
                sortBy === sort.key && styles.activeSortBtn
              ]}
              onPress={() => setSortBy(sort.key as typeof sortBy)}
            >
              <Text style={[
                styles.sortBtnText,
                sortBy === sort.key && styles.activeSortBtnText
              ]}>
                {sort.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Client List */}
      <FlatList
        data={sortedClients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClientCard 
            client={item} 
            onPress={() => {
              setSelectedClient(item);
              setShowClientModal(true);
            }}
            onQuickCollect={() => {
              setSelectedClient(item);
              setShowQuickCollectModal(true);
            }}
            onRequestPayout={() => handleRequestPayout(item)}
          />
        )}
        style={styles.clientList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[LogoColors.primary.red]}
            tintColor={LogoColors.primary.red}
          />
        }
        onEndReached={loadMoreClients}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => (
          loadingMore ? (
            <View style={styles.loadingMore}>
              <Text style={styles.loadingMoreText}>Loading more clients...</Text>
            </View>
          ) : null
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={LogoColors.text.secondary} />
            <Text style={styles.emptyText}>
              {loading ? 'Loading clients...' : 'No clients found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {loading ? 'Please wait while we fetch your clients' : 'Try adjusting your search or filter criteria'}
            </Text>
          </View>
        )}
      />

      {/* Client Details Modal */}
      <Modal
        visible={showClientModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowClientModal(false)}
      >
        {selectedClient && (
          <ClientInfoModal
            client={selectedClient}
            onClose={() => setShowClientModal(false)}
            onCollect={() => {
              setShowClientModal(false);
              setShowQuickCollectModal(true);
            }}
            onRequestPayout={() => {
              setShowClientModal(false);
              handleRequestPayout(selectedClient);
            }}
          />
        )}
      </Modal>

      {/* Quick Collect Modal */}
      <Modal
        visible={showQuickCollectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuickCollectModal(false)}
      >
        <CollectionModal
          client={selectedClient}
          amount={collectAmount}
          onAmountChange={setCollectAmount}
          onCollect={handleQuickCollect}
          onClose={() => {
            setShowQuickCollectModal(false);
            setCollectAmount('');
          }}
          loading={contributionLoading}
        />
      </Modal>

      {/* Payout Request Modal */}
      <PayoutRequestModal
        visible={showPayoutModal}
        client={selectedClient}
        onClose={() => {
          setShowPayoutModal(false);
          setSelectedClient(null);
        }}
        onSuccess={handlePayoutSuccess}
      />

      {/* Create Client Modal */}
      <CreateClientModal
        visible={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        onSuccess={() => {
          setShowCreateClientModal(false);
          dispatch(fetchClients());
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LogoColors.background.primary,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: LogoColors.background.primary,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: LogoColors.primary.red,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: LogoColors.text.secondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LogoColors.background.secondary,
    margin: 20,
    marginTop: 0,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: LogoColors.text.primary,
  },
  filterContainer: {
    marginBottom: 16,
    paddingVertical: 2,
    maxHeight: 40,
  },
  filterContent: {
    paddingHorizontal: 20,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: LogoColors.background.secondary,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  activeFilterBtn: {
    backgroundColor: LogoColors.primary.red,
    borderColor: LogoColors.primary.red,
  },
  filterBtnText: {
    fontSize: 14,
    color: LogoColors.text.secondary,
    fontWeight: '500',
  },
  activeFilterBtnText: {
    color: LogoColors.text.onPrimary,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 14,
    color: LogoColors.text.secondary,
    marginRight: 12,
    fontWeight: '500',
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: LogoColors.background.tertiary,
  },
  activeSortBtn: {
    backgroundColor: LogoColors.secondary.navy,
  },
  sortBtnText: {
    fontSize: 12,
    color: LogoColors.text.secondary,
  },
  activeSortBtnText: {
    color: LogoColors.text.onSecondary,
  },
  clientList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: LogoColors.text.secondary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: LogoColors.text.light,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: LogoColors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: LogoColors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: LogoColors.primary.red,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: LogoColors.text.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: LogoColors.background.primary,
  },
  keyboardAvoid: {
    flex: 1,
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
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: LogoColors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: LogoColors.text.primary,
    backgroundColor: LogoColors.background.secondary,
  },
  switchGroup: {
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
    borderRadius: 8,
    backgroundColor: LogoColors.background.secondary,
  },
  switchText: {
    fontSize: 16,
    color: LogoColors.text.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: LogoColors.border.light,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: LogoColors.background.secondary,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  submitButton: {
    backgroundColor: LogoColors.primary.red,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.onPrimary,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LogoColors.border.light,
    borderRadius: 8,
    padding: 12,
    backgroundColor: LogoColors.background.secondary,
  },
  dateButtonText: {
    fontSize: 16,
    color: LogoColors.text.primary,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LogoColors.border.light,
    borderRadius: 8,
    padding: 12,
    backgroundColor: LogoColors.background.secondary,
  },
  dropdownText: {
    fontSize: 16,
    color: LogoColors.text.primary,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
  },
  addNewText: {
    fontSize: 14,
    color: LogoColors.primary.red,
    marginLeft: 4,
    fontWeight: '500',
  },
  customAddressContainer: {
    padding: 12,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
    borderRadius: 8,
    backgroundColor: LogoColors.background.secondary,
  },
  cancelCustomButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    padding: 8,
  },
  cancelCustomText: {
    fontSize: 14,
    color: LogoColors.text.secondary,
  },
  dobContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dobInput: {
    flex: 1,
  },
  calendarButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
    borderRadius: 8,
    backgroundColor: LogoColors.background.secondary,
  },
  loadingMore: {
    padding: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    color: LogoColors.text.secondary,
  },
});