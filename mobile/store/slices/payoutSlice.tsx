import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PayoutRequest, ClientBalance } from '@/constants/types';
import { payoutsAPI } from '@/services/api';

// Async thunks
export const fetchPayouts = createAsyncThunk(
  'payouts/fetchPayouts',
  async (_, { rejectWithValue, getState }) => {
    try {
      const response = await payoutsAPI.listPayouts();
      return Array.isArray(response) ? response : response.results || [];
    } catch (error) {
      console.warn('Payouts API failed:', error);
      // Return empty array instead of current state to avoid stale data
      return [];
    }
  }
);

export const requestClientPayout = createAsyncThunk(
  'payouts/requestClientPayout',
  async ({ clientId, requestedAmount }: { clientId: string; requestedAmount: number }, { rejectWithValue }) => {
    try {
      const response = await payoutsAPI.requestClientPayout(clientId, requestedAmount);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to request payout');
    }
  }
);

export const fetchClientBalance = createAsyncThunk(
  'payouts/fetchClientBalance',
  async (clientId: string, { rejectWithValue }) => {
    try {
      console.log('Redux: Fetching client balance for:', clientId);
      const response = await payoutsAPI.getClientBalance(clientId);
      console.log('Redux: Client balance response:', response);
      return response;
    } catch (error) {
      console.error('Redux: Client balance error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch client balance');
    }
  }
);

// State interface
interface PayoutState {
  payouts: PayoutRequest[];
  clientBalances: { [clientId: string]: ClientBalance };
  loading: boolean;
  error: string | null;
  submitting: boolean;
}

// Initial state
const initialState: PayoutState = {
  payouts: [],
  clientBalances: {},
  loading: false,
  error: null,
  submitting: false,
};

// Slice
const payoutSlice = createSlice({
  name: 'payouts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPayouts: (state) => {
      state.payouts = [];
    },
    clearClientBalance: (state, action: PayloadAction<string>) => {
      delete state.clientBalances[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch payouts
      .addCase(fetchPayouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayouts.fulfilled, (state, action: PayloadAction<PayoutRequest[]>) => {
        state.loading = false;
        state.payouts = action.payload;
      })
      .addCase(fetchPayouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // Keep payouts as empty array instead of undefined
        if (!state.payouts) {
          state.payouts = [];
        }
      })
      // Request client payout
      .addCase(requestClientPayout.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(requestClientPayout.fulfilled, (state, action: PayloadAction<PayoutRequest>) => {
        state.submitting = false;
        state.payouts.unshift(action.payload);
      })
      .addCase(requestClientPayout.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      })
      // Fetch client balance
      .addCase(fetchClientBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientBalance.fulfilled, (state, action: PayloadAction<ClientBalance>) => {
        state.loading = false;
        state.clientBalances[action.payload.client_id] = action.payload;
      })
      .addCase(fetchClientBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearPayouts, clearClientBalance } = payoutSlice.actions;
export default payoutSlice.reducer;