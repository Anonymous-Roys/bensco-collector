import { View, ScrollView, TouchableWithoutFeedback, Keyboard, StyleSheet } from 'react-native';
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

export default function CollectorHome() {
  const dispatch = useDispatch<AppDispatch>();
  const { totalCount } = useSelector((state: RootState) => state.clients);

  const [menuVisible, setMenuVisible] = useState(false);
  const [user, setUser] = useState<{ username?: string; unique_code?: string } | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [clientsVisited, setClientsVisited] = useState(0);
  const [recentCollections, setRecentCollections] = useState<{ id: string; clientName: string; amount: number; time: string; synced: boolean }[]>([]);
  const [refreshing, setRefreshing] = useState(false);


  const processContributions = (contributions: any[]) => {
    const today = new Date().toDateString();
    
    // Filter contributions from today only
    const todaysContributions = contributions.filter((c: any) => {
      const contributionDate = new Date(c.date || c.createdAt || c.timestamp).toDateString();
      return contributionDate === today;
    });

    // Calculate today's total
    const todayTotalAmount = todaysContributions.reduce((sum: number, c: any) => {
      return sum + (parseFloat(c.amount) || 0);
    }, 0);

    // Get unique clients visited today (using client_id or client_name)
    const uniqueClientIds = new Set();
    todaysContributions.forEach((c: any) => {
      // Use client_id if available, otherwise fall back to client_name
      const clientIdentifier = c.client_id || c.client_name || c.client;
      if (clientIdentifier) {
        uniqueClientIds.add(clientIdentifier);
      }
    });

    const uniqueClientsCount = Math.min(uniqueClientIds.size, totalCount || 0);

    // Get recent collections (all contributions, not just today's)
    const recentItems = contributions.slice(0, 10).map((c: any) => ({
      id: c.id,
      clientName: c.client_name || c.client || 'Client',
      amount: parseFloat(c.amount) || 0,
      time: c.date || '',
      synced: true,
    }));

    return {
      todayTotal: todayTotalAmount,
      clientsVisited: uniqueClientsCount,
      recentCollections: recentItems
    };
  };

  useEffect(() => {
    const init = async () => {
      const auth = await storageService.getAuthData();
      setUser(auth.userData || null);
      dispatch(fetchClients());
      try {
        const contribs = await contributionAPI.getContributions();
        const processedData = processContributions(contribs || []);
        
        setTodayTotal(processedData.todayTotal);
        setClientsVisited(processedData.clientsVisited);
        setRecentCollections(processedData.recentCollections);
      } catch {
        setRecentCollections([]);
        setTodayTotal(0);
        setClientsVisited(0);
      }
    };
    init();
  }, [dispatch, totalCount]);

  const handleLogout = async () => {
    try {
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleRecordPress = () => {
    router.push('/collect' as any);
  };

  const handleHistoryPress = () => {
    router.push('/(collector)/history' as any);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
     dispatch(fetchClients());
      const contribs = await contributionAPI.getContributions();
      const processedData = processContributions(contribs || []);
      
      setTodayTotal(processedData.todayTotal);
      setClientsVisited(processedData.clientsVisited);
      setRecentCollections(processedData.recentCollections);
    } catch {
      // Keep existing data on error
    } finally {
      setRefreshing(false);
    }
  };

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
});