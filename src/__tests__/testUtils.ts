/**
 * Shared test utilities for screens requiring a Redux store.
 * Uses a hand-wired mock store to bypass the Jest/Node 24 ESM
 * boundary issue with @reduxjs/toolkit in this environment.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// Minimal mock Redux store that provides the auth state the screens need
const mockDispatch = jest.fn().mockResolvedValue({});
const mockStore = {
  getState: () => ({
    auth: {
      token: null,
      isAuthenticated: false,
      userId: null,
      loading: false,
    },
  }),
  dispatch: mockDispatch,
  subscribe: jest.fn(),
};

// Mock react-redux at the module level so screens get our mock store
jest.mock('react-redux', () => ({
  useDispatch: () => mockStore.dispatch,
  useSelector: (selector: any) => selector(mockStore.getState()),
  Provider: ({ children }: any) => children,
}));

export { mockStore, mockDispatch };

export function renderScreen(ui: React.ReactElement) {
  return render(ui);
}
