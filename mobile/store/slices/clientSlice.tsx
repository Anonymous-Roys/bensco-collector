import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Client, ClientListResponse } from '@/constants/types';
import { clientAPI } from '@/services/api';

// Async thunks
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (params: { search?: string; page?: number; loadMore?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const response = await clientAPI.getClients({
        search: params?.search,
        page: params?.page || 1,
        page_size: 15
      });
      return { ...response, loadMore: params?.loadMore || false };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch clients');
    }
  }
);

export const createClient = createAsyncThunk(
  'clients/createClient',
  async (clientData: Partial<Client>, { rejectWithValue }) => {
    try {
      const response = await clientAPI.createClient(clientData);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create client');
    }
  }
);

// State interface
interface ClientState {
  clients: Client[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  hasNextPage: boolean;
}

// Initial state
const initialState: ClientState = {
  clients: [],
  loading: false,
  loadingMore: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  hasNextPage: false,
};

// Slice
const clientSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearClients: (state) => {
      state.clients = [];
      state.totalCount = 0;
      state.currentPage = 1;
      state.hasNextPage = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch clients
      .addCase(fetchClients.pending, (state, action) => {
        if (action.meta.arg?.loadMore) {
          state.loadingMore = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        
        if (action.payload.loadMore) {
          // Append new clients for infinite scroll
          state.clients = [...state.clients, ...action.payload.results];
        } else {
          // Replace clients for new search or refresh
          state.clients = action.payload.results;
        }
        
        state.totalCount = action.payload.count;
        state.currentPage = action.meta.arg?.page || 1;
        state.hasNextPage = action.payload.next !== null;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload as string;
      })
      // Create client
      .addCase(createClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createClient.fulfilled, (state, action: PayloadAction<Client>) => {
        state.loading = false;
        state.clients.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(createClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearClients } = clientSlice.actions;
export default clientSlice.reducer;
