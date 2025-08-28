import React, { useState, useEffect } from 'react';
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
} from 'react-native';
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

export default function ClientsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { clients, loading, error, totalCount } = useSelector((state: RootState) => state.clients);
  const { loading: contributionLoading } = useSelector((state: RootState) => state.contributions);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'pending' | 'complete'>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showQuickCollectModal, setShowQuickCollectModal] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'amount' | 'date'>('name');

  // Fetch clients on component mount
  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Filter and search clients
  const filteredClients = clients
    .filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          client.phone_number.includes(searchQuery);
      // For now, we'll show all clients as active since the backend doesn't provide status
      const matchesFilter = selectedFilter === 'all' || selectedFilter === 'active';
      return matchesSearch && matchesFilter;
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

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchClients());
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Clients</Text>
        <Text style={styles.headerSubtitle}>
          {totalCount} client{totalCount !== 1 ? 's' : ''}
        </Text>
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
        data={filteredClients}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LogoColors.background.primary,
  },
  header: {
    padding: 20,
    backgroundColor: LogoColors.background.primary,
  },
  headerTitle: {
    fontSize: 28,
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
});