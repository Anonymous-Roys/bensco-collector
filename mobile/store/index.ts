import { configureStore } from '@reduxjs/toolkit';
import clientReducer from './slices/clientSlice';
import contributionReducer from './slices/contributionSlice';

export const store = configureStore({
  reducer: {
    clients: clientReducer,
    contributions: contributionReducer,
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
