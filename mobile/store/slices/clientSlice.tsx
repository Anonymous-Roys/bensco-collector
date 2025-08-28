import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Client, ClientListResponse } from '@/constants/types';
import { clientAPI } from '@/services/api';

// Async thunks
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      const response = await clientAPI.getClients();
      return response;
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
  error: string | null;
  totalCount: number;
  nextPage: string | null;
  previousPage: string | null;
}

// Initial state
const initialState: ClientState = {
  clients: [],
  loading: false,
  error: null,
  totalCount: 0,
  nextPage: null,
  previousPage: null,
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
      state.nextPage = null;
      state.previousPage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch clients
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action: PayloadAction<ClientListResponse>) => {
        state.loading = false;
        state.clients = action.payload.results;
        state.totalCount = action.payload.count;
        state.nextPage = action.payload.next;
        state.previousPage = action.payload.previous;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
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
