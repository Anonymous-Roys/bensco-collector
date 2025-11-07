import { useCallback, useEffect, useMemo, useState } from 'react';
// import { apiService } from '@/lib/apiService';

export interface BackendPayout {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'auto_rejected';
  payout_type: 'client_specific' | 'bulk';
  requested_amount: string;
  available_balance: string;
  total_paid: string;
  commission: string;
  net_payout: string;
  requested_on: string;
  approved_on?: string | null;
  paid_on?: string | null;
  rejection_reason?: string | null;
  client: {
    id: string;
    name: string;
    phone_number?: string | null;
    is_fixed?: boolean;
    daily_amount?: string;
  } | string;
}

export const usePayouts = () => {
  const [payouts, setPayouts] = useState<BackendPayout[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // const data = await apiService.getPayouts();
      // setPayouts(Array.isArray(data) ? data as BackendPayout[] : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load payouts');
      setPayouts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

 



  

  const pendingPayouts = useMemo(() => payouts.filter(p => ['pending', 'approved', 'auto_rejected'].includes(p.status)), [payouts]);
  const allPayouts = payouts;

  return {
    payouts,
    allPayouts,
    pendingPayouts,
    isLoading,
    error,
    fetchPayouts,
 
    
  };
};
