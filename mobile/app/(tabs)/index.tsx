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

    // Get recent collections (latest 5)
    const recentItems = contributions
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.date || a.timestamp);
        const dateB = new Date(b.created_at || b.date || b.timestamp);
        return dateB.getTime() - dateA.getTime(); // Sort by newest first
      })
      .slice(0, 5)
      .map((c: any) => {
        const dateString = c.date || c.created_at || c.createdAt || c.timestamp;
        const contributionDate = new Date(dateString);
        
        return {
          id: c.id,
          clientName: c.client_name || c.client || 'Client',
          amount: parseFloat(c.amount) || 0,
          time: contributionDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
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
        // Fetch data with individual error handling
        const results = await Promise.allSettled([
          dispatch(fetchClients()).unwrap(),
          contributionAPI.getCollectorStats(),
          contributionAPI.getContributions()
        ]);

        const [clientsResult, statsResult, contribsResult] = results;
        
        // Handle stats
        if (statsResult.status === 'fulfilled') {
          console.log('Collector stats:', statsResult.value);
          setTodayTotal(statsResult.value.today_total || 0);
          setClientsVisited(statsResult.value.today_count || 0);
        }
        
        // Handle contributions
        if (contribsResult.status === 'fulfilled') {
          console.log('Raw contributions:', contribsResult.value);
          const processedData = processContributions(contribsResult.value || []);
          setRecentCollections(processedData.recentCollections);
        }
        
        // Show error only if critical data failed to load
        const failedCount = results.filter(r => r.status === 'rejected').length;
        if (failedCount > 0) {
          console.warn(`${failedCount} API calls failed during initial load`);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Don't show alert on initial load, just log the error
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
      // Fetch data with individual error handling
      const results = await Promise.allSettled([
        dispatch(fetchClients()).unwrap(),
        contributionAPI.getCollectorStats(),
        contributionAPI.getContributions()
      ]);

      // Process results even if some fail
      const [clientsResult, statsResult, contribsResult] = results;
      
      // Handle stats
      if (statsResult.status === 'fulfilled') {
        setTodayTotal(statsResult.value.today_total || 0);
        setClientsVisited(statsResult.value.today_count || 0);
      }
      
      // Handle contributions
      if (contribsResult.status === 'fulfilled') {
        const processedData = processContributions(contribsResult.value || []);
        setRecentCollections(processedData.recentCollections);
      }
      
      // Show error only if all requests failed
      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount === results.length) {
        Alert.alert('Error', 'Unable to refresh data. Please check your connection.');
      }
    } catch (error) {
      console.error('Error refreshing:', error);
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