import { View, ScrollView, TouchableWithoutFeedback, Keyboard, StyleSheet, Text, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LogoColors } from '@/constants/Colors';
import { Header } from '@/components/home/Header';
import { MetricsCards } from '@/components/home/MetricsCards';
import { QuickActions } from '@/components/home/QuickActions';
import { RecentCollections } from '@/components/home/RecentCollections';
import { MenuOverlay } from '@/components/home/MenuOverlay';
import { ActionButtons } from '@/components/home/ActionButtons';
import { storageService, contributionAPI } from '@/services/api';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchClients } from '@/store/slices/clientSlice';
import { useAuth } from '@/hooks/useAuth';

export default function CollectorHome() {
  const dispatch = useDispatch<AppDispatch>();
  const { totalCount } = useSelector((state: RootState) => state.clients);
  const { isAuthenticated, isLoading, user, logout } = useAuth(); // Added logout function
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [clientsVisited, setClientsVisited] = useState(0);
  const [recentCollections, setRecentCollections] = useState<{ id: string; clientName: string; amount: number; time: string; synced: boolean }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dataLoading, setDataLoading] = useState(true); // Separate loading state for data

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  const processContributions = (contributions: any[]) => {
    const today = new Date().toDateString();
    
    // Filter contributions from today only
    const todaysContributions = contributions.filter((c: any) => {
      const dateString = c.date || c.created_at || c.createdAt || c.timestamp;
      const contributionDate = new Date(dateString).toDateString();
      return contributionDate === today;
    });

    // Calculate today's total
    const todayTotalAmount = todaysContributions.reduce((sum: number, c: any) => {
      return sum + (parseFloat(c.amount) || 0);
    }, 0);

    // Get unique clients visited today
    const uniqueClientIds = new Set();
    todaysContributions.forEach((c: any) => {
      const clientIdentifier = c.client_id || c.client;
      if (clientIdentifier) {
        uniqueClientIds.add(clientIdentifier);
      }
    });

    const uniqueClientsCount = uniqueClientIds.size;

    // Get recent collections
    const recentItems = contributions.slice(0, 10).map((c: any) => {
      const dateString = c.date || c.created_at || c.createdAt || c.timestamp;
      
      return {
        id: c.id,
        clientName: c.client_name || c.client || 'Client',
        amount: parseFloat(c.amount) || 0,
        time: dateString,
        synced: true,
      };
    });

    return {
      todayTotal: todayTotalAmount,
      clientsVisited: uniqueClientsCount,
      recentCollections: recentItems
    };
  };

  // Load data only when component mounts and user is authenticated
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) return;
      
      setDataLoading(true);
      try {
        // Fetch clients and contributions in parallel
        await Promise.all([
          dispatch(fetchClients()).unwrap(), // unwrap() to handle promise rejection
          contributionAPI.getContributions()
        ]).then(([clientsResult, contribs]) => {
          console.log('Raw contributions:', contribs);
          
          const processedData = processContributions(contribs || []);
          
          setTodayTotal(processedData.todayTotal);
          setClientsVisited(processedData.clientsVisited);
          setRecentCollections(processedData.recentCollections);
        });
      } catch (error) {
        console.error('Error loading data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
        
        // Reset data on error
        setRecentCollections([]);
        setTodayTotal(0);
        setClientsVisited(0);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, dispatch]); // Only depend on isAuthenticated and dispatch

  const handleLogout = async () => {
    try {
      await logout(); // Use the logout function from useAuth
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback redirect if logout fails
      router.replace('/(auth)/login');
    }
  };

  const handleRecordPress = () => {
    router.push('/collect');
  };

  const handleHistoryPress = () => {
    router.push('/(collector)/history');
  };

  const handleRefresh = async () => {
    if (!isAuthenticated) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchClients()).unwrap(),
        contributionAPI.getContributions()
      ]).then(([clientsResult, contribs]) => {
        const processedData = processContributions(contribs || []);
        
        setTodayTotal(processedData.todayTotal);
        setClientsVisited(processedData.clientsVisited);
        setRecentCollections(processedData.recentCollections);
      });
    } catch (error) {
      console.error('Error refreshing:', error);
      Alert.alert('Error', 'Failed to refresh data.');
    } finally {
      setRefreshing(false);
    }
  };

  // Show loading state
  if (isLoading || dataLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={LogoColors.primary.red} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={LogoColors.primary.red} />
        <Text style={styles.loadingText}>Redirecting to login...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => {
      if (menuVisible) setMenuVisible(false);
      Keyboard.dismiss();
    }}>
      <View style={styles.container}>
        <Header 
          name={user?.username || 'Collector'}
          id={user?.unique_code || ''}
          profilePhoto={require('../../assets/images/favicon.png')}
          onMenuPress={() => setMenuVisible(!menuVisible)}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[LogoColors.primary.red]}
            />
          }
        >
          <MetricsCards 
            todayTotal={todayTotal}
            clientsVisited={clientsVisited}
            targetClients={totalCount}
          />

          <ActionButtons 
            onRecordPress={handleRecordPress}
            onHistoryPress={handleHistoryPress}
          />

          <QuickActions />

          <RecentCollections collections={recentCollections} />
        </ScrollView>

        {menuVisible && (
          <MenuOverlay onLogout={handleLogout} />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LogoColors.background.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: LogoColors.text.primary,
  },
});