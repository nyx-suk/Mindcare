import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as Keychain from 'react-native-keychain';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  userId: number | null;
  loading: boolean;
}

const initialState: AuthState = {
  token: null,
  isAuthenticated: false,
  userId: null,
  loading: true,
};

// Async thunk to load token securely on app start
export const loadSecureToken = createAsyncThunk(
  'auth/loadSecureToken',
  async () => {
    try {
      // Race against a 3-second timeout — Keychain can hang on emulators
      const keychainPromise = Keychain.getGenericPassword();
      const timeoutPromise = new Promise<false>((resolve) =>
        setTimeout(() => resolve(false), 3000)
      );
      const credentials = await Promise.race([keychainPromise, timeoutPromise]);
      if (credentials) {
        return {
          userId: parseInt((credentials as Keychain.UserCredentials).username, 10),
          token: (credentials as Keychain.UserCredentials).password,
        };
      }
    } catch (e) {
      // Keychain unavailable (emulator without secure enclave) — silent fail
    }
    return null;
  }
);

// Async thunk to save token securely on login/register
export const setSecureCredentials = createAsyncThunk(
  'auth/setSecureCredentials',
  async (payload: { token: string; userId: number }) => {
    try {
      await Keychain.setGenericPassword(payload.userId.toString(), payload.token);
    } catch (e) {
      // Keychain unavailable on emulator — continue anyway, state is still set
    }
    return payload;
  }
);

// Async thunk to remove token on logout
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async () => {
    try {
      await Keychain.resetGenericPassword();
    } catch (e) {
      // Keychain unavailable — continue
    }
    return null;
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadSecureToken.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.token = action.payload.token;
          state.userId = action.payload.userId;
          state.isAuthenticated = true;
        }
      })
      .addCase(loadSecureToken.rejected, (state) => {
        // Thunk failed for any reason — stop loading and show auth stack
        state.loading = false;
      })
      .addCase(setSecureCredentials.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.userId = action.payload.userId;
        state.isAuthenticated = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.token = null;
        state.userId = null;
        state.isAuthenticated = false;
      });
  },
});

export default authSlice.reducer;
