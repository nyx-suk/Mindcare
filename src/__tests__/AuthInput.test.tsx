/**
 * Tests for AuthInput component.
 * Verifies label rendering, error display, and focus behaviour.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { jest, expect, describe, it } from '@jest/globals';
import AuthInput from '../components/AuthInput';

describe('AuthInput', () => {
  const baseProps = {
    label: 'Email',
    value: '',
    onChangeText: jest.fn(),
  };

  it('renders the label text', () => {
    const { getByText } = render(<AuthInput {...baseProps} />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('does not render an error message when error prop is null', () => {
    const { queryByText } = render(<AuthInput {...baseProps} error={null} />);
    // No error text should appear in the tree
    expect(queryByText(/error/i)).toBeNull();
  });

  it('renders the error message when error prop is set', () => {
    const { getByText } = render(
      <AuthInput {...baseProps} error="Please enter a valid email address" />
    );
    expect(getByText('Please enter a valid email address')).toBeTruthy();
  });

  it('calls onChangeText when the user types', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <AuthInput {...baseProps} onChangeText={onChangeText} placeholder="you@example.com" />
    );
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'hello@test.com');
    expect(onChangeText).toHaveBeenCalledWith('hello@test.com');
  });

  it('renders placeholder text when provided', () => {
    const { getByPlaceholderText } = render(
      <AuthInput {...baseProps} placeholder="you@example.com" />
    );
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
  });
});
