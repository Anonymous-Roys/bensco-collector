import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { LogoColors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

export const AnalyticsChart: React.FC = () => {
const chartData = [
  { value: 450, label: 'Mon', frontColor: '#EF476F' },
  { value: 680, label: 'Tue', frontColor: '#FFD166' },
  { value: 720, label: 'Wed', frontColor: '#06D6A0' },
  { value: 850, label: 'Thu', frontColor: '#118AB2' },
  { value: 920, label: 'Fri', frontColor: '#073B4C' },
  { value: 750, label: 'Sat', frontColor: '#F8961E' },
];

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Weekly Collection Trend</Text>
      
      <View style={styles.chartWrapper}>
        <BarChart
          data={chartData}
          width={width - 112}
          height={240}
          barWidth={32}
          spacing={20}
          roundedTop
          hideRules={false}
          rulesColor={LogoColors.border.light}
          rulesType="dashed"
          noOfSections={5}
          yAxisTextStyle={{ color: LogoColors.text.secondary, fontSize: 12 }}
          yAxisLabelPrefix="₵"
          xAxisLabelTextStyle={{ color: LogoColors.text.secondary, fontSize: 12 }}
          showVerticalLines
          verticalLinesColor={LogoColors.border.light}
          verticalLinesStrokeDashArray={[3, 3]}
          initialSpacing={20}
          endSpacing={20}
          showReferenceLine1
          referenceLine1Position={680}
          referenceLine1Config={{
            color: LogoColors.status.success,
            dashWidth: 2,
            dashGap: 3,
          }}
          isAnimated
          animationDuration={1000}
        />
      </View>
      
      {/* Summary stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>₵4,870</Text>
          <Text style={styles.statLabel}>Total Week</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>₵811</Text>
          <Text style={styles.statLabel}>Daily Avg</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>+12%</Text>
          <Text style={[styles.statLabel, styles.positiveTrend]}>vs Last Week</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: LogoColors.background.surface,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: LogoColors.text.primary,
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold', // Use your preferred font family
  },
  chartWrapper: {
    alignItems: 'center',
    marginVertical: 8,
    height: 240,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LogoColors.border.light,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: LogoColors.text.primary,
    fontFamily: 'Inter-SemiBold', // Use your preferred font family
  },
  statLabel: {
    fontSize: 12,
    color: LogoColors.text.secondary,
    marginTop: 4,
    fontFamily: 'Inter-Regular', // Use your preferred font family
  },
  positiveTrend: {
    color: LogoColors.status.success,
  },
  // Add any additional styles you need
});