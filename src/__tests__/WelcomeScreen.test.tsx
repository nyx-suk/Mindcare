/**
 * Integration tests for the WelcomeScreen.
 * Verifies branding text, CTA buttons, and navigation calls.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WelcomeScreen from '../../src/screens/WelcomeScreen';

// Mock expo-linear-gradient — not available in Jest environment
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
} as any;

const mockRoute = { key: 'Welcome', name: 'Welcome', params: undefined } as any;

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the app name "MindCare"', () => {
    const { getByText } = render(
      <WelcomeScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('MindCare')).toBeTruthy();
  });

  it('renders the hero headline', () => {
    const { getByText } = render(
      <WelcomeScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('Your mental health, simplified.')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    const { getByText } = render(
      <WelcomeScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('A private space to check in with yourself every day.')).toBeTruthy();
  });

  it('renders the footer text', () => {
    const { getByText } = render(
      <WelcomeScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('You are not alone.')).toBeTruthy();
  });

  it('navigates to Register when "Get Started" is pressed', () => {
    const { getByText } = render(
      <WelcomeScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Get Started'));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('navigates to Login when "I already have an account" is pressed', () => {
    const { getByText } = render(
      <WelcomeScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('I already have an account'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
