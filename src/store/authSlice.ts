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
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
      // Assuming keychain username stores userId and password stores token
      return { 
        userId: parseInt(credentials.username, 10), 
        token: credentials.password 
      };
    }
    return null;
  }
);

// Async thunk to save token securely on login/register
export const setSecureCredentials = createAsyncThunk(
  'auth/setSecureCredentials',
  async (payload: { token: string; userId: number }) => {
    // Saves userId as username and token as password in iOS Keychain / Android Keystore
    await Keychain.setGenericPassword(payload.userId.toString(), payload.token);
    return payload;
  }
);

// Async thunk to remove token on logout
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async () => {
    await Keychain.resetGenericPassword();
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
