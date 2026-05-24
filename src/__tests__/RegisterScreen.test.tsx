/**
 * Integration tests for RegisterScreen.
 * Covers all-at-once validation, password strength indicator,
 * duplicate email error handling, and navigation links.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../../src/screens/RegisterScreen';

jest.mock('../../src/api/client', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn<any, any>().mockResolvedValue(true),
  getGenericPassword: jest.fn<any, any>().mockResolvedValue(false),
  resetGenericPassword: jest.fn<any, any>().mockResolvedValue(true),
}));

const mockDispatch = jest.fn<any, any>().mockResolvedValue({});
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: () => null,
  Provider: ({ children }: any) => children,
}));

jest.mock('../../src/store/authSlice', () => ({
  setSecureCredentials: jest.fn((payload: any) => ({ type: 'auth/setSecureCredentials', payload })),
  logoutUser: jest.fn(() => ({ type: 'auth/logoutUser' })),
  loadSecureToken: jest.fn(() => ({ type: 'auth/loadSecureToken' })),
}));

import apiClient from '../../src/api/client';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack } as any;
const mockRoute = { key: 'Register', name: 'Register', params: undefined } as any;

describe('RegisterScreen — form validation (all errors at once)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows email and password errors when submitted with all fields empty', async () => {
    const { getByText, findByText } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Create Account'));
    expect(await findByText('Please enter a valid email address')).toBeTruthy();
    expect(await findByText('Password must be 8+ characters and include a number')).toBeTruthy();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows confirm-password error when passwords differ', async () => {
    const { getByText, findByText, getAllByPlaceholderText, getByPlaceholderText } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordInputs[0], 'Password1');
    fireEvent.changeText(passwordInputs[1], 'Different9');
    fireEvent.press(getByText('Create Account'));
    expect(await findByText('Passwords do not match')).toBeTruthy();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows password error when password has no number', async () => {
    const { getByText, getAllByPlaceholderText } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />
    );
    const passwordInputs = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordInputs[0], 'NoNumbers');
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(getByText('Password must be 8+ characters and include a number')).toBeTruthy();
    });
  });

  it('shows confirm password error when passwords do not match', async () => {
    const { getByText, getAllByPlaceholderText, getByPlaceholderText } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordInputs[0], 'Password1');
    fireEvent.changeText(passwordInputs[1], 'Different1');
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });
  });
});

describe('RegisterScreen — API error handling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows duplicate email error when API returns "already registered"', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Email already registered' } },
    } as any);
    const { getByText, getAllByPlaceholderText, getByPlaceholderText } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'existing@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordInputs[0], 'Password1');
    fireEvent.changeText(passwordInputs[1], 'Password1');
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(
        getByText('An account with this email already exists. Try signing in.')
      ).toBeTruthy();
    });
  });

  it('dispatches secure credentials on successful registration', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { token: 'new-token', userId: 456 },
    });

    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'newuser@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordInputs[0], 'Password1');
    fireEvent.changeText(passwordInputs[1], 'Password1');
    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});

describe('RegisterScreen — navigation', () => {
  it('navigates to Login when "Sign in" footer link is pressed', () => {
    const { getByText } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Sign in'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('calls goBack when the back arrow is pressed', () => {
    const { getByText } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('←'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
