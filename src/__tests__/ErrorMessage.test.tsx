import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { jest, expect, describe, it } from '@jest/globals';
import ErrorMessage from '../../src/components/ErrorMessage';

describe('ErrorMessage', () => {
  it('renders the provided error message', () => {
    const { getByText } = render(
      <ErrorMessage message="Something went wrong" />
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('⚠️')).toBeTruthy();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <ErrorMessage message="Try again later" onRetry={onRetry} />
    );

    const button = getByText('Try again');
    expect(button).toBeTruthy();

    fireEvent.press(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry is omitted', () => {
    const { queryByText } = render(
      <ErrorMessage message="No retry available" />
    );

    expect(queryByText('Try again')).toBeNull();
  });
});
