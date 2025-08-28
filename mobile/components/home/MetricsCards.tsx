import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogoColors } from '@/constants/Colors';

import type { ComponentProps } from 'react';

interface MetricCardProps {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: string;
  label: string;
  backgroundColor: string;
}

export const MetricCard = ({ icon, value, label, backgroundColor }: MetricCardProps) => (
  <View style={[styles.metricCard, { backgroundColor }]}>
    <MaterialCommunityIcons name={icon} size={28} color="white" />
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

interface MetricsCardsProps {
  todayTotal: number;
  clientsVisited: number;
  targetClients: number;
}

export const MetricsCards = ({ todayTotal, clientsVisited, targetClients }: MetricsCardsProps) => {
  return (
    <View style={styles.metricsRow}>
      <MetricCard
        icon="cash"
        value={`GHS ${todayTotal.toFixed(2)}`}
        label="Today's Total"
        backgroundColor={LogoColors.status.success}
      />
      <MetricCard
        icon="account-multiple"
        value={`${clientsVisited}/${targetClients}`}
        label="Clients Visited"
        backgroundColor={LogoColors.secondary.navy}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    height: 100,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  metricLabel: {
    color: 'white',
    fontSize: 12,
  },
});