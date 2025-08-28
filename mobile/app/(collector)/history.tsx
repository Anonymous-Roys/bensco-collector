import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Client, Contribution } from '@/constants/types';
import { MetricCard } from '@/components/home/MetricsCards';
import { clientAPI, contributionAPI } from '@/services/api';

// Live data will be fetched in component

export default function CollectionHistory() {
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [contribs, clientsResp] = await Promise.all([
          clientId ? contributionAPI.getContributionsByClient(clientId) : contributionAPI.getContributions(),
          clientAPI.getClients().catch(() => ({ results: [] as Client[] } as any)),
        ]);
        if (!mounted) return;
        setContributions(contribs || []);
        const list = Array.isArray((clientsResp as any).results) ? (clientsResp as any).results : (clientsResp as any);
        setClients(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load history');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [clientId]);

  const clientIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients) map[c.id] = c.name;
    return map;
  }, [clients]);

  const totalCollected = useMemo(() => {
    return contributions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  }, [contributions]);

  const pendingCollections = 0; // Backend doesn't expose status in Contribution

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    };
    return new Date(dateStr).toLocaleDateString('en-GB', options);
  };

  // Render each collection record
  const renderItem = ({ item }: { item: Contribution }) => (
    <TouchableOpacity 
      style={styles.recordCard}
    //   onPress={() => router.push(`/(collector)/collection/${item.id}`)}
    >
      <View style={styles.recordLeft}>
        <MaterialCommunityIcons 
          name={'cash'} 
          size={24} 
          color={LogoColors.primary.red} 
        />
        <View style={styles.recordDetails}>
          <Text style={styles.clientName}>{clientIdToName[item.client] || item.client}</Text>
          <Text style={styles.recordDate}>
            {formatDisplayDate(item.created_at)} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      <View style={styles.recordRight}>
        <Text style={styles.amountText}>GHS {(parseFloat(item.amount) || 0).toFixed(2)}</Text>
        <MaterialCommunityIcons 
          name={'check-circle'} 
          size={20} 
          color={LogoColors.status.success} 
        />
      </View>
    </TouchableOpacity>
  );

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
  
        <Text style={styles.headerTitle}>
          {clientId ? `${clientIdToName[clientId] || 'Client'}'s Collections` : 'Collection History'}
        </Text>
        </View>
        <View style={styles.summaryRow}>
          <MetricCard
        icon="cash"
        value={`GHS ${totalCollected.toFixed(2)}`}
        label="Total Collected"
        backgroundColor={LogoColors.status.success}
      />
          
          <MetricCard
        icon="clock"
        value={pendingCollections.toString()}
        label="Pending"
        // backgroundColor={[styles.summaryValue, { color: LogoColors.status.warning }]}
        backgroundColor={LogoColors.status.warning }
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
        data={contributions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
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
});