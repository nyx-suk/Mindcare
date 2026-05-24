import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoadingButton from '../../src/components/LoadingButton';
import { jest, expect, describe, it } from '@jest/globals';
import { ActivityIndicator, TouchableOpacity } from 'react-native';

describe('LoadingButton', () => {
  it('renders the label when not loading', () => {
    const { getByText } = render(
      <LoadingButton label="Submit" onPress={jest.fn()} isLoading={false} />
    );

    expect(getByText('Submit')).toBeTruthy();
  });

  it('shows an ActivityIndicator when loading', () => {
    const { UNSAFE_getByType } = render(
      <LoadingButton label="Submit" onPress={jest.fn()} isLoading />
    );

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('calls onPress when pressed and not loading', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <LoadingButton label="Submit" onPress={onPress} isLoading={false} />
    );

    fireEvent.press(getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <LoadingButton label="Submit" onPress={onPress} isLoading />
    );

    const button = UNSAFE_getByType(TouchableOpacity);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <LoadingButton label="Submit" onPress={onPress} isLoading={false} disabled />
    );

    fireEvent.press(getByText('Submit'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
