// components/StatsCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LogoColors } from '@/constants/Colors';
// import { MaterialCommunityIcons } from '@expo/vector-icons';



const { width } = Dimensions.get('window');

// Stats Card Component
export const StatsCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: string;
  trend?: string;
}> = ({ title, value, subtitle, icon, color, trend }) => (
  <View style={[styles.statsCard, { borderLeftColor: color }]}>
    <View style={styles.statsCardContent}>
      <View style={styles.statsCardHeader}>
        {/* <MaterialCommunityIcons name={icon} size={24} color={color} /> */}
        <Text style={styles.statsCardTitle}>{title}</Text>
      </View>
      <Text style={[styles.statsCardValue, { color }]}>{value}</Text>
      {subtitle && (
        <Text style={styles.statsCardSubtitle}>{subtitle}</Text>
      )}
      {trend && (
        <Text style={[styles.trendText, { color: LogoColors.status.success }]}>
          ↗️ {trend}
        </Text>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statsCard: {
    backgroundColor: LogoColors.background.surface,
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
    borderLeftWidth: 4,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  statsCardContent: {
    flex: 1,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsCardTitle: {
    fontSize: 14,
    color: LogoColors.text.secondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  statsCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsCardSubtitle: {
    fontSize: 12,
    color: LogoColors.text.light,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

});