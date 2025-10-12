import { configureStore } from '@reduxjs/toolkit';
import clientReducer from './slices/clientSlice';
import contributionReducer from './slices/contributionSlice';
import payoutReducer from './slices/payoutSlice';

export const store = configureStore({
  reducer: {
    clients: clientReducer,
    contributions: contributionReducer,
    payouts: payoutReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
