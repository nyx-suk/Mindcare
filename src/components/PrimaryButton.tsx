import React, { useRef } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { RADIUS, AppTheme } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function PrimaryButton({
  label,
  onPress,
  variant = 'solid',
  isLoading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleValue, {
      toValue: 0.96,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleValue, {
      toValue: 1.0,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const isSolid = variant === 'solid';
  const isDisabledOrLoading = disabled || isLoading;

  const buttonStyle = isSolid ? styles.solidButton : styles.outlineButton;
  const textStyle = isSolid ? styles.solidText : styles.outlineText;
  const indicatorColor = isSolid ? '#ffffff' : theme.primary;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }, style]}>
      <TouchableOpacity
        onPress={isDisabledOrLoading ? undefined : onPress}
        onPressIn={isDisabledOrLoading ? undefined : handlePressIn}
        onPressOut={isDisabledOrLoading ? undefined : handlePressOut}
        activeOpacity={1}
        disabled={isDisabledOrLoading}
        style={[
          styles.buttonBase,
          buttonStyle,
          isDisabledOrLoading && styles.disabledButton,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color={indicatorColor} size="small" />
        ) : (
          <Text style={[styles.textBase, textStyle]}>{label}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  buttonBase: {
    height: 52,
    width: '100%',
    borderRadius: RADIUS.button,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  solidButton: {
    backgroundColor: theme.primary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  textBase: {
    fontSize: 16,
    fontWeight: '600',
  },
  solidText: {
    color: '#ffffff',
  },
  outlineText: {
    color: theme.primary,
  },
});
