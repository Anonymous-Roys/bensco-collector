import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Menu, 
  DollarSign, 
  Users, 
  Plus, 
  List, 
  BookOpen, 
  BarChart3, 
  Home, 
  Settings,
  RefreshCw,
  Check,
  Clock,
  ArrowRight
} from 'lucide-react';

const FieldWorkerHomepage = () => {
  const [todaysTotal, setTodaysTotal] = useState(850.00);
  const [clientsVisited, setClientsVisited] = useState({ visited: 12, total: 15 });
  const [notifications, setNotifications] = useState(3);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced'); // synced, syncing, offline
  const [activeTab, setActiveTab] = useState('home');
  
  const [recentCollections] = useState([
    { id: 1, client: 'Mary Asante', amount: 50.00, time: '2 hours ago', status: 'synced' },
    { id: 2, client: 'Kwame Osei', amount: 75.00, time: '3 hours ago', status: 'synced' },
    { id: 3, client: 'Akosua Mensah', amount: 100.00, time: '4 hours ago', status: 'pending' },
    { id: 4, client: 'Kofi Adomako', amount: 25.00, time: '5 hours ago', status: 'synced' },
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setSyncStatus('syncing');
    
    // Simulate data refresh
    setTimeout(() => {
      setIsRefreshing(false);
      setSyncStatus('synced');
    }, 2000);
  };

  const formatCurrency = (amount) => {
    return `GHS ${amount.toFixed(2)}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'synced':
        return <Check className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-red-500" />;
    }
  };

  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'collect', label: 'Collect', icon: Plus },
    { id: 'history', label: 'History', icon: List },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 pt-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3">
              <span className="text-green-600 font-bold text-sm">JD</span>
            </div>
            <div>
              <p className="text-sm opacity-90">{getGreeting()}, John!</p>
              <p className="text-xs opacity-75">ID: ACC240101</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {getSyncStatusIcon()}
            <div className="relative">
              <Bell className="w-6 h-6" />
              {notifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </div>
            <Menu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-500 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(todaysTotal)}</p>
                <p className="text-sm opacity-90">Today's Total</p>
              </div>
              <DollarSign className="w-8 h-8 opacity-80" />
            </div>
          </div>
          
          <div className="bg-blue-500 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{clientsVisited.visited}/{clientsVisited.total}</p>
                <p className="text-sm opacity-90">Clients Visited</p>
              </div>
              <Users className="w-8 h-8 opacity-80" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            className="w-full bg-green-600 text-white py-4 rounded-lg flex items-center justify-center space-x-2 font-semibold text-lg shadow-lg hover:bg-green-700 transition-colors"
            onClick={() => alert('Opening contribution form...')}
          >
            <Plus className="w-6 h-6" />
            <span>Record New Contribution</span>
          </button>
          
          <button 
            className="w-full bg-white border-2 border-green-600 text-green-600 py-3 rounded-lg flex items-center justify-center space-x-2 font-medium hover:bg-green-50 transition-colors"
            onClick={() => alert('Opening collection history...')}
          >
            <List className="w-5 h-5" />
            <span>View Collection History</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            className="bg-white p-4 rounded-lg shadow-sm border flex flex-col items-center space-y-2 hover:bg-gray-50 transition-colors"
            onClick={() => alert('Opening client list...')}
          >
            <BookOpen className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Clients</span>
          </button>
          
          <button 
            className="bg-white p-4 rounded-lg shadow-sm border flex flex-col items-center space-y-2 hover:bg-gray-50 transition-colors relative"
            onClick={() => alert('Opening notifications...')}
          >
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Alerts</span>
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications}
              </span>
            )}
          </button>
          
          <button 
            className="bg-white p-4 rounded-lg shadow-sm border flex flex-col items-center space-y-2 hover:bg-gray-50 transition-colors"
            onClick={() => alert('Opening reports...')}
          >
            <BarChart3 className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Reports</span>
          </button>
        </div>

        {/* Recent Collections */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Recent Collections</h3>
              <button 
                className="text-green-600 text-sm font-medium flex items-center space-x-1"
                onClick={() => alert('Opening full history...')}
              >
                <span>View All</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {recentCollections.slice(0, 4).map((collection) => (
              <div key={collection.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{collection.client}</p>
                  <p className="text-sm text-gray-500">{collection.time}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(collection.amount)}
                  </span>
                  {collection.status === 'synced' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pull to Refresh */}
        <div className="text-center py-4">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-green-600 text-sm font-medium flex items-center space-x-2 mx-auto hover:text-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Pull to refresh'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-gray-600 hover:text-green-600'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FieldWorkerHomepage;