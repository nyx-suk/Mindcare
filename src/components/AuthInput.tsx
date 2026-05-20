import React, { useState, forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { SPACING, RADIUS, AppTheme } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';

export type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  placeholder?: string;
} & Omit<TextInputProps, 'style'>;

const AuthInput = forwardRef<TextInput, AuthInputProps>(function AuthInput(
  { label, value, onChangeText, error = null, placeholder, onFocus, onBlur, ...rest },
  ref
) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  let borderColor = theme.border;
  let borderWidth = 1.5;

  if (error) {
    borderColor = theme.error;
    borderWidth = 2;
  } else if (isFocused) {
    borderColor = theme.borderFocus;
    borderWidth = 2;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, { borderColor, borderWidth }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textHint}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        {...rest}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

export default AuthInput;

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.input,
    padding: SPACING.md,
    fontSize: 15,
    color: theme.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: theme.error,
    marginTop: SPACING.xs,
  },
});
