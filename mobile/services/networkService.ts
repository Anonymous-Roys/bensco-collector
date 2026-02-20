import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  strength: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class NetworkService {
  private networkState: NetworkState = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
    strength: 0
  };

  private listeners: ((state: NetworkState) => void)[] = [];
  private retryQueue: Map<string, any> = new Map();
  public isInitialized = false;

  // Default retry configuration
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get initial network state
      const state = await NetInfo.fetch();
      this.updateNetworkState(state);

      // Subscribe to network changes
      NetInfo.addEventListener(this.handleNetworkChange.bind(this));
      
      this.isInitialized = true;
      console.log('🌐 NetworkService initialized:', this.networkState);
    } catch (error) {
      console.error('❌ Failed to initialize NetworkService:', error);
      // Set a default state if initialization fails
      this.networkState = {
        isConnected: true, // Assume connected if we can't determine
        isInternetReachable: true,
        type: 'unknown',
        strength: 3
      };
      this.isInitialized = true;
    }
  }

  private handleNetworkChange(state: any): void {
    const wasConnected = this.networkState.isConnected;
    this.updateNetworkState(state);
    
    // If we just got connected, process retry queue
    if (!wasConnected && this.networkState.isConnected) {
      console.log('🔄 Connection restored, processing retry queue...');
      this.processRetryQueue();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(this.networkState));
  }

  private updateNetworkState(state: any): void {
    this.networkState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type || 'unknown',
      strength: this.getSignalStrength(state)
    };
  }

  private getSignalStrength(state: any): number {
    if (state.details?.strength !== undefined) {
      return state.details.strength;
    }
    if (state.details?.cellularGeneration) {
      // Estimate strength based on cellular generation
      const generation = state.details.cellularGeneration;
      if (generation === '5g') return 5;
      if (generation === '4g') return 4;
      if (generation === '3g') return 3;
      if (generation === '2g') return 2;
    }
    return this.networkState.isConnected ? 3 : 0;
  }

  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  isOnline(): boolean {
    // If not initialized, assume online to avoid blocking requests
    if (!this.isInitialized) {
      console.warn('⚠️ NetworkService not initialized, assuming online');
      return true;
    }
    return this.networkState.isConnected && this.networkState.isInternetReachable;
  }

  isWeakConnection(): boolean {
    if (!this.isInitialized) return false;
    return this.networkState.isConnected && this.networkState.strength < 2;
  }

  addNetworkListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Enhanced retry mechanism with exponential backoff
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        // Check if we're online before attempting (only if initialized)
        if (this.isInitialized && !this.isOnline() && attempt === 0) {
          throw new Error('No internet connection');
        }

        const result = await operation();
        
        // Remove from retry queue on success
        this.retryQueue.delete(operationId);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // If it's the last attempt, don't wait
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt),
          retryConfig.maxDelay
        );

        console.log(`🔄 Retry attempt ${attempt + 1}/${retryConfig.maxRetries} for ${operationId} in ${delay}ms`);
        
        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;
        await this.delay(jitteredDelay);
      }
    }

    // If we're offline, add to retry queue (only if initialized)
    if (this.isInitialized && !this.isOnline()) {
      this.retryQueue.set(operationId, { operation, config });
      console.log(`📥 Added ${operationId} to retry queue`);
    }

    throw lastError!;
  }

  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.size === 0) return;

    console.log(`🔄 Processing ${this.retryQueue.size} queued operations...`);

    const operations = Array.from(this.retryQueue.entries());
    this.retryQueue.clear();

    for (const [operationId, { operation, config }] of operations) {
      try {
        await this.executeWithRetry(operation, operationId, config);
        console.log(`✅ Successfully executed queued operation: ${operationId}`);
      } catch (error) {
        console.error(`❌ Failed to execute queued operation ${operationId}:`, error);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cache management for offline functionality
  async cacheData(key: string, data: any, ttl: number = 3600000): Promise<void> {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl
      };
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('❌ Failed to cache data:', error);
    }
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - cacheItem.timestamp > cacheItem.ttl) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('❌ Failed to get cached data:', error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  // Connection quality assessment
  getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (!this.isInitialized || !this.networkState.isConnected) return 'offline';
    
    const { strength, type } = this.networkState;
    
    if (type === 'wifi') {
      if (strength >= 4) return 'excellent';
      if (strength >= 3) return 'good';
      if (strength >= 2) return 'fair';
      return 'poor';
    }
    
    if (type === 'cellular') {
      if (strength >= 4) return 'good';
      if (strength >= 3) return 'fair';
      return 'poor';
    }
    
    return 'fair';
  }

  // Bandwidth estimation (simple)
  async estimateBandwidth(): Promise<number> {
    if (!this.isOnline()) return 0;

    try {
      const startTime = Date.now();
      const response = await fetch('https://httpbin.org/bytes/1024', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        await response.blob();
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000; // seconds
        const bandwidth = (1024 * 8) / duration; // bits per second
        return bandwidth;
      }
    } catch (error) {
      console.warn('⚠️ Bandwidth estimation failed:', error);
    }
    
    return 0;
  }
}

export const networkService = new NetworkService();