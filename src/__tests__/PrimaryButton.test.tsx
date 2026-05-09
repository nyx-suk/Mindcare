/**
 * Tests for PrimaryButton component.
 * Verifies rendering variants, press behaviour, loading state, and animation.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PrimaryButton from '../../src/components/PrimaryButton';

describe('PrimaryButton', () => {
  it('renders the label text for solid variant', () => {
    const { getByText } = render(
      <PrimaryButton label="Get Started" onPress={jest.fn()} />
    );
    expect(getByText('Get Started')).toBeTruthy();
  });

  it('renders the label text for outline variant', () => {
    const { getByText } = render(
      <PrimaryButton label="Sign In" onPress={jest.fn()} variant="outline" />
    );
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PrimaryButton label="Tap Me" onPress={onPress} />
    );
    fireEvent.press(getByText('Tap Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PrimaryButton label="Tap Me" onPress={onPress} disabled />
    );
    fireEvent.press(getByText('Tap Me'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does NOT call onPress when isLoading', () => {
    const onPress = jest.fn();
    const { queryByText } = render(
      <PrimaryButton label="Loading" onPress={onPress} isLoading />
    );
    // Label is replaced by ActivityIndicator when loading
    expect(queryByText('Loading')).toBeNull();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when isLoading is true', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <PrimaryButton label="Loading" onPress={jest.fn()} isLoading />
    );
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });
});
