import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import assessmentReducer from './assessmentSlice';
import settingsReducer from './settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assessments: assessmentReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
