import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import assessmentReducer from './assessmentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assessments: assessmentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
