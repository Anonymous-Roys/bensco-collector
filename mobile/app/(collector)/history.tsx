import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Client, Contribution } from '@/constants/types';
import { MetricCard } from '@/components/home/MetricsCards';
import { clientAPI, contributionAPI } from '@/services/api';

interface GroupedContribution {
  date: string;
  total_amount: number;
  count: number;
  contributions: {
    id: string;
    client_name: string;
    amount: number;
    time: string;
    created_at: string;
  }[];
}

export default function CollectionHistory() {
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allGroupedData, setAllGroupedData] = useState<GroupedContribution[]>([]);
  const [displayedData, setDisplayedData] = useState<GroupedContribution[]>([]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await contributionAPI.getGroupedContributions();
        if (!mounted) return;
        
        const groupedData = Array.isArray(data) ? data : [];
        setAllGroupedData(groupedData);
        
        // Load first page
        const firstPageData = groupedData.slice(0, ITEMS_PER_PAGE);
        setDisplayedData(firstPageData);
        setHasNextPage(groupedData.length > ITEMS_PER_PAGE);
        setCurrentPage(1);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load history');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const loadMore = async () => {
    if (!hasNextPage || loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      // Simulate async loading for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const nextPage = currentPage + 1;
      const startIndex = 0;
      const endIndex = nextPage * ITEMS_PER_PAGE;
      
      const newData = allGroupedData.slice(startIndex, endIndex);
      setDisplayedData(newData);
      setHasNextPage(endIndex < allGroupedData.length);
      setCurrentPage(nextPage);
    } catch (e: any) {
      setError(e?.message || 'Failed to load more history');
    } finally {
      setLoadingMore(false);
    }
  };

  const totalCollected = useMemo(() => {
    return allGroupedData.reduce((sum, day) => sum + day.total_amount, 0);
  }, [allGroupedData]);

  const totalCount = useMemo(() => {
    return allGroupedData.reduce((sum, day) => sum + day.count, 0);
  }, [allGroupedData]);

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    };
    return new Date(dateStr).toLocaleDateString('en-GB', options);
  };

  // Render individual contribution within a day
  const renderContribution = (contribution: any) => (
    <View key={contribution.id} style={styles.contributionItem}>
      <View style={styles.contributionLeft}>
        <MaterialCommunityIcons 
          name="account" 
          size={20} 
          color={LogoColors.text.secondary} 
        />
        <View style={styles.contributionDetails}>
          <Text style={styles.contributionClientName}>{contribution.client_name}</Text>
          <Text style={styles.contributionTime}>{contribution.time}</Text>
        </View>
      </View>
      <Text style={styles.contributionAmount}>GHS {contribution.amount.toFixed(2)}</Text>
    </View>
  );

  // Render each day folder
  const renderDayFolder = ({ item }: { item: GroupedContribution }) => {
    const isExpanded = expandedDates.has(item.date);
    
    return (
      <View style={styles.dayContainer}>
        <TouchableOpacity 
          style={styles.dayHeader}
          onPress={() => toggleDateExpansion(item.date)}
        >
          <View style={styles.dayHeaderLeft}>
            <MaterialCommunityIcons 
              name={isExpanded ? "folder-open" : "folder"} 
              size={24} 
              color={LogoColors.primary.red} 
            />
            <View style={styles.dayHeaderDetails}>
              <Text style={styles.dayDate}>{formatDisplayDate(item.date)}</Text>
              <Text style={styles.daySubtitle}>{item.count} collections</Text>
            </View>
          </View>
          <View style={styles.dayHeaderRight}>
            <Text style={styles.dayTotal}>GHS {item.total_amount.toFixed(2)}</Text>
            <MaterialCommunityIcons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={LogoColors.text.secondary} 
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.contributionsContainer}>
            {item.contributions.map(renderContribution)}
          </View>
        )}
      </View>
    );
  };

  // Get icon for payment method
  // const getPaymentMethodIcon = (_method: 'cash' | 'momo' | 'bank') => 'cash';

  return (
    <Modal>
    <View style={styles.container}>
      {/* Header */}
      <View>
        <View style={styles.header}>
         <TouchableOpacity onPress={() => router.back()}>
        <MaterialCommunityIcons name="chevron-left" size={44} color="white" />
      </TouchableOpacity>
  
        <Text style={styles.headerTitle}>Collection History</Text>
        </View>
        <View style={styles.summaryRow}>
          <MetricCard
            icon="cash"
            value={`GHS ${totalCollected.toFixed(2)}`}
            label="Total Collected"
            backgroundColor={LogoColors.status.success}
          />
          <MetricCard
            icon="clipboard-list"
            value={totalCount.toString()}
            label="Total Collections"
            backgroundColor={LogoColors.primary.red}
          />
        </View>
      </View>

  
      {loading && (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={LogoColors.primary.red} />
          <Text style={styles.emptyText}>Loading history...</Text>
        </View>
      )}
      {/* Collection List */}
      <FlatList
        data={displayedData}
        renderItem={renderDayFolder}
        keyExtractor={item => item.date}
        contentContainerStyle={styles.listContainer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={LogoColors.primary.red} />
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : hasNextPage ? (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="clipboard-text-outline" 
              size={48} 
              color={LogoColors.text.secondary} 
            />
            <Text style={styles.emptyText}>No collection records found</Text>
          </View>
        }
      />
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LogoColors.background.primary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap:10,
    // justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: LogoColors.primary.red,
    borderBottomWidth: 1,
    borderBottomColor: LogoColors.border.light,
    // borderRadius: 12,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // For Android shadow
  },


  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: LogoColors.text.onPrimary,
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 4,
  },
  summaryValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: LogoColors.background.secondary,
  },
  activeFilter: {
    backgroundColor: LogoColors.primary.red,
  },
  filterText: {
    color: LogoColors.text.secondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: LogoColors.background.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  recordDetails: {
    gap: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
  },
  recordDate: {
    fontSize: 12,
    color: LogoColors.text.secondary,
  },
  recordRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: LogoColors.text.secondary,
    marginTop: 16,
  },
  
  // New styles for grouped view
  dayContainer: {
    backgroundColor: LogoColors.background.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LogoColors.border.light,
    overflow: 'hidden',
  },
  
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: LogoColors.background.secondary,
  },
  
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  
  dayHeaderDetails: {
    gap: 2,
  },
  
  dayDate: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
  },
  
  daySubtitle: {
    fontSize: 12,
    color: LogoColors.text.secondary,
  },
  
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  dayTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LogoColors.primary.red,
  },
  
  contributionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  
  contributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
    backgroundColor: LogoColors.background.primary,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: LogoColors.primary.red,
  },
  
  contributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  
  contributionDetails: {
    gap: 2,
  },
  
  contributionClientName: {
    fontSize: 14,
    fontWeight: '500',
    color: LogoColors.text.primary,
  },
  
  contributionTime: {
    fontSize: 12,
    color: LogoColors.text.secondary,
  },
  
  contributionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: LogoColors.text.primary,
  },
  
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  
  loadingMoreText: {
    fontSize: 14,
    color: LogoColors.text.secondary,
  },
  
  loadMoreButton: {
    backgroundColor: LogoColors.primary.red,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 16,
    alignSelf: 'center',
  },
  
  loadMoreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});