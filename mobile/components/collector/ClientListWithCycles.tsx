import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Client } from '@/constants/types';
import { clientAPI, savingsAPI } from '@/services/api';
import { ClientCycleCard } from './ClientCycleCard';

interface ClientWithCycle extends Client {
  cycleData?: {
    current_cycle: {
      progress_percentage: number;
      contributing_days: number;
      cycle_length: number;
      total_collected: number;
      status: string;
    } | null;
  };
}

export const ClientListWithCycles: React.FC = () => {
  const [clients, setClients] = useState<ClientWithCycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await clientAPI.getClients();
      const clientsData = response.results || [];
      
      // Fetch cycle data for each client
      const clientsWithCycles = await Promise.all(
        clientsData.map(async (client) => {
          try {
            const cycleData = await savingsAPI.getClientCycles(client.id);
            return { ...client, cycleData };
          } catch (error) {
            console.error(`Failed to fetch cycle data for client ${client.id}:`, error);
            return { ...client, cycleData: null };
          }
        })
      );
      
      setClients(clientsWithCycles);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  const toggleExpanded = (clientId: string) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
  };

  const renderClientItem = ({ item }: { item: ClientWithCycle }) => {
    const isExpanded = expandedClient === item.id;
    const currentCycle = item.cycleData?.current_cycle;
    
    return (
      <View style={styles.clientCard}>
        <TouchableOpacity
          style={styles.clientHeader}
          onPress={() => toggleExpanded(item.id)}
        >
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{item.name}</Text>
            <Text style={styles.clientDetails}>
              {item.is_fixed ? 'Fixed' : 'Variable'} • ₵{item.amount_daily}/day
            </Text>
            {currentCycle && (
              <View style={styles.cyclePreview}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${Math.min(currentCycle.progress_percentage, 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {currentCycle.contributing_days}/{currentCycle.cycle_length} days • 
                  ₵{currentCycle.total_collected.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.clientActions}>
            {currentCycle && (
              <View style={[styles.statusBadge, { 
                backgroundColor: currentCycle.status === 'active' 
                  ? Colors.light.status.success + '20' 
                  : Colors.light.text.light + '20' 
              }]}>
                <Text style={[styles.statusText, { 
                  color: currentCycle.status === 'active' 
                    ? Colors.light.status.success 
                    : Colors.light.text.secondary 
                }]}>
                  {currentCycle.status.toUpperCase()}
                </Text>
              </View>
            )}
            <MaterialCommunityIcons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color={Colors.light.text.secondary} 
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            <ClientCycleCard 
              client={item} 
              onCycleUpdate={() => fetchClients()} 
            />
          </View>
        )}
      </View>
    );
  };

  if (loading && clients.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary.red} />
        <Text style={styles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Client Cycles</Text>
        <Text style={styles.subtitle}>Track savings progress for all clients</Text>
      </View>
      
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderClientItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.light.primary.red]}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background.primary,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.text.secondary,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  clientCard: {
    backgroundColor: Colors.light.background.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border.light,
    overflow: 'hidden',
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  clientDetails: {
    fontSize: 14,
    color: Colors.light.text.secondary,
    marginBottom: 8,
  },
  cyclePreview: {
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.light.border.light,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.status.success,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.light.text.secondary,
  },
  clientActions: {
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border.light,
    padding: 16,
    paddingTop: 0,
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
});