import { Platform } from 'react-native';
import axios from 'axios';
import { store } from '../store';
import { logoutUser } from '../store/authSlice';

// Uses 10.0.2.2 for Android emulator pointing to localhost, mapping localhost for iOS + Web natively
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to retrieve JWT from Redux authSlice
apiClient.interceptors.request.use(
  (config) => {
    // Redux store is synchronous so we don't need to await Keychain here
    const token = store.getState().auth.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logoutUser() as any);
    }
    if (error.code === 'ERR_NETWORK') {
      return Promise.reject(new Error("Network error. Please check your connection."));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
