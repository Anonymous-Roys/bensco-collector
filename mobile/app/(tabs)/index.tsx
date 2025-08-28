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
import { storageService } from '@/services/api';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchClients } from '@/store/slices/clientSlice';
import { contributionAPI } from '@/services/api';

export default function CollectorHome() {
  const dispatch = useDispatch<AppDispatch>();
  const { totalCount } = useSelector((state: RootState) => state.clients);

  const [menuVisible, setMenuVisible] = useState(false);
  const [user, setUser] = useState<{ username?: string; unique_code?: string } | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [clientsVisited, setClientsVisited] = useState(0);
  const [recentCollections, setRecentCollections] = useState<{ id: string; clientName: string; amount: number; time: string; synced: boolean }[]>([]);

  useEffect(() => {
    const init = async () => {
      const auth = await storageService.getAuthData();
      setUser(auth.userData || null);
      dispatch(fetchClients());
      try {
        const contribs = await contributionAPI.getContributions();
        // Basic mapping for recent list and metrics
        const items = (contribs || []).slice(0, 10).map((c: any) => ({
          id: c.id,
          clientName: c.client_name || c.client || 'Client',
          amount: parseFloat(c.amount),
          time: c.date || '',
          synced: true,
        }));
        setRecentCollections(items);
        setTodayTotal(items.reduce((sum, i) => sum + (isNaN(i.amount) ? 0 : i.amount), 0));
        setClientsVisited(items.length);
      } catch {
        setRecentCollections([]);
        setTodayTotal(0);
        setClientsVisited(0);
      }
    };
    init();
  }, [dispatch]);

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