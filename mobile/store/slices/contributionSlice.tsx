import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Contribution, ContributionCreateRequest, ContributionListResponse } from '@/constants/types';
import { contributionAPI } from '@/services/api';

// Async thunks
export const fetchContributions = createAsyncThunk(
  'contributions/fetchContributions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await contributionAPI.getContributions();
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch contributions');
    }
  }
);

export const createContribution = createAsyncThunk(
  'contributions/createContribution',
  async (contributionData: ContributionCreateRequest, { rejectWithValue }) => {
    try {
      const response = await contributionAPI.createContribution(contributionData);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create contribution');
    }
  }
);

// State interface
interface ContributionState {
  contributions: Contribution[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  nextPage: string | null;
  previousPage: string | null;
}

// Initial state
const initialState: ContributionState = {
  contributions: [],
  loading: false,
  error: null,
  totalCount: 0,
  nextPage: null,
  previousPage: null,
};

// Slice
const contributionSlice = createSlice({
  name: 'contributions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearContributions: (state) => {
      state.contributions = [];
      state.totalCount = 0;
      state.nextPage = null;
      state.previousPage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch contributions
      .addCase(fetchContributions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContributions.fulfilled, (state, action: PayloadAction<ContributionListResponse>) => {
        state.loading = false;
        state.contributions = action.payload.results;
        state.totalCount = action.payload.count;
        state.nextPage = action.payload.next;
        state.previousPage = action.payload.previous;
      })
      .addCase(fetchContributions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create contribution
      .addCase(createContribution.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContribution.fulfilled, (state, action: PayloadAction<Contribution>) => {
        state.loading = false;
        state.contributions.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(createContribution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearContributions } = contributionSlice.actions;
export default contributionSlice.reducer;
