import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Client } from '@/constants/types';
import { savingsAPI } from '@/services/api';

interface ClientCycleCardProps {
  client: Client;
  onCycleUpdate?: () => void;
}

interface CycleData {
  current_cycle: {
    id: string;
    status: string;
    total_collected: number;
    contributing_days: number;
    cycle_length: number;
    commission: number;
    progress_percentage: number;
    business_days_passed: number;
    can_close: boolean;
  } | null;
  cycle_history: Array<{
    id: string;
    status: string;
    total_collected: number;
    contributing_days: number;
    commission: number;
    closed_on: string;
  }>;
}

export const ClientCycleCard: React.FC<ClientCycleCardProps> = ({
  client,
  onCycleUpdate,
}) => {
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [closingCycle, setClosingCycle] = useState(false);

  useEffect(() => {
    fetchCycleData();
  }, [client.id]);

  const fetchCycleData = async () => {
    setLoading(true);
    try {
      const data = await savingsAPI.getClientCycles(client.id);
      setCycleData(data);
    } catch (error) {
      console.error('Failed to fetch cycle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCycle = async () => {
    if (!cycleData?.current_cycle?.can_close) {
      Alert.alert('Cannot Close Cycle', 'This cycle cannot be closed yet.');
      return;
    }

    Alert.alert(
      'Close Cycle',
      `Are you sure you want to close the current cycle for ${client.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Close', onPress: closeCycle, style: 'destructive' }
      ]
    );
  };

  const closeCycle = async () => {
    setClosingCycle(true);
    try {
      await savingsAPI.closeCycle(client.id);
      await fetchCycleData();
      onCycleUpdate?.();
      Alert.alert('Success', 'Cycle closed successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to close cycle');
    } finally {
      setClosingCycle(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.light.primary.red} />
        <Text style={styles.loadingText}>Loading cycle data...</Text>
      </View>
    );
  }

  if (!cycleData) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={20} color={Colors.light.status.error} />
        <Text style={styles.errorText}>Failed to load cycle data</Text>
      </View>
    );
  }

  const { current_cycle, cycle_history } = cycleData;

  return (
    <View style={styles.container}>
      {/* Current Cycle */}
      {current_cycle ? (
        <View style={styles.currentCycle}>
          <View style={styles.header}>
            <Text style={styles.title}>Current Cycle</Text>
            <View style={[styles.statusBadge, { backgroundColor: Colors.light.status.success + '20' }]}>
              <Text style={[styles.statusText, { color: Colors.light.status.success }]}>
                {current_cycle.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min(current_cycle.progress_percentage, 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {current_cycle.progress_percentage.toFixed(1)}% Complete
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Collected</Text>
              <Text style={styles.statValue}>₵{current_cycle.total_collected.toFixed(2)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Days</Text>
              <Text style={styles.statValue}>
                {current_cycle.contributing_days}/{current_cycle.cycle_length}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Commission</Text>
              <Text style={styles.statValue}>₵{current_cycle.commission.toFixed(2)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Business Days</Text>
              <Text style={styles.statValue}>{current_cycle.business_days_passed}</Text>
            </View>
          </View>

          {current_cycle.can_close && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseCycle}
              disabled={closingCycle}
            >
              {closingCycle ? (
                <ActivityIndicator size="small" color={Colors.light.text.onPrimary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={16} color={Colors.light.text.onPrimary} />
                  <Text style={styles.closeButtonText}>Close Cycle</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.noCycle}>
          <MaterialCommunityIcons name="information" size={24} color={Colors.light.text.secondary} />
          <Text style={styles.noCycleText}>No active cycle</Text>
        </View>
      )}

      {/* Cycle History */}
      {cycle_history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Recent Cycles</Text>
          {cycle_history.slice(0, 3).map((cycle) => (
            <View key={cycle.id} style={styles.historyItem}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyAmount}>₵{cycle.total_collected.toFixed(2)}</Text>
                <Text style={styles.historyDetails}>
                  {cycle.contributing_days} days • ₵{cycle.commission.toFixed(2)} commission
                </Text>
                <Text style={styles.historyDate}>
                  Closed: {new Date(cycle.closed_on).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: Colors.light.text.light + '20' }]}>
                <Text style={[styles.statusText, { color: Colors.light.text.secondary }]}>
                  {cycle.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.light.border.light,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: Colors.light.text.secondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    marginLeft: 8,
    color: Colors.light.status.error,
  },
  currentCycle: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text.primary,
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
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.light.border.light,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.status.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.light.text.secondary,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text.primary,
  },
  closeButton: {
    backgroundColor: Colors.light.primary.red,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: Colors.light.text.onPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  noCycle: {
    alignItems: 'center',
    padding: 20,
  },
  noCycleText: {
    marginTop: 8,
    color: Colors.light.text.secondary,
  },
  historySection: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border.light,
    paddingTop: 16,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text.primary,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border.light,
  },
  historyInfo: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text.primary,
  },
  historyDetails: {
    fontSize: 12,
    color: Colors.light.text.secondary,
    marginTop: 2,
  },
  historyDate: {
    fontSize: 10,
    color: Colors.light.text.light,
    marginTop: 2,
  },
});