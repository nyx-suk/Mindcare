/**
 * Integration tests for LoginScreen.
 * Covers form validation (client-side), navigation links, and API error display.
 * API calls and Redux are mocked — no real network or store needed.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { jest, expect, describe, it } from '@jest/globals';
import LoginScreen from '../../src/screens/LoginScreen';

// Mock the Axios API client
jest.mock('../../src/api/client', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: (jest.fn() as jest.Mock).mockResolvedValue(true),
  getGenericPassword: (jest.fn() as jest.Mock).mockResolvedValue(false),
  resetGenericPassword: (jest.fn() as jest.Mock).mockResolvedValue(true),
}));

// Mock Redux — avoids @reduxjs/toolkit ESM boundary in Jest 29 + Node 24
const mockDispatch = (jest.fn() as jest.Mock).mockResolvedValue({});
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: () => null,
  Provider: ({ children }: any) => children,
}));

// Mock authSlice thunks
jest.mock('../../src/store/authSlice', () => ({
  setSecureCredentials: jest.fn((payload: any) => ({ type: 'auth/setSecureCredentials', payload })),
  logoutUser: jest.fn(() => ({ type: 'auth/logoutUser' })),
  loadSecureToken: jest.fn(() => ({ type: 'auth/loadSecureToken' })),
}));

import apiClient from '../../src/api/client';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack } as any;
const mockRoute = { key: 'Login', name: 'Login', params: undefined } as any;

describe('LoginScreen — form validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows email error when submitted with empty fields', async () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows email error for malformed email', async () => {
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'not-an-email');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('shows password error when password is too short', async () => {
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'short');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(getByText('Password must be at least 8 characters')).toBeTruthy();
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

describe('LoginScreen — API error handling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows inline error on 401 response', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce({
      response: { status: 401 },
    } as any);
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(getByText('Incorrect email or password')).toBeTruthy();
    });
  });

  it('shows network error when no response', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce({} as any);
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(getByText('Network error. Please check your connection.')).toBeTruthy();
    });
  });

  it('dispatches auth credentials on successful login', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { token: 'fake-jwt-token', userId: 123 },
    });
    const { getByText, getByPlaceholderText, queryByText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(queryByText('Incorrect email or password')).toBeNull();
      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});

describe('LoginScreen — navigation', () => {
  it('navigates to Register when "Sign up" is pressed', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Sign up'));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('calls goBack when the back arrow is pressed', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('←'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
