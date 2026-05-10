import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useDispatch } from 'react-redux';
import AuthInput from '../components/AuthInput';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { setSecureCredentials } from '../store/authSlice';
import apiClient from '../api/client';
import { RootStackParamList } from './WelcomeScreen';
import { AppDispatch } from '../store';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError(null);
    setApiError(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError(null);
    setApiError(null);
  };

  const validate = (): boolean => {
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await apiClient.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const { token, userId } = response.data;
      await dispatch(setSecureCredentials({ token, userId }));
      console.log('Token dispatched:', token); // TODO: remove after debugging
      // AppNavigator watches isAuthenticated — no manual navigation needed
    } catch (error: any) {
      if (error.response) {
        // Server responded with an error status
        const status = error.response.status;
        if (status === 401) {
          setApiError('Incorrect email or password');
        } else {
          setApiError('Something went wrong. Please try again.');
        }
      } else if (
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error' ||
        !error.response
      ) {
        // No response at all — server is down or unreachable
        setApiError('Network error. Please check your connection.');
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.backButtonWrapper}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Welcome')}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.headline}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {/* Form */}
          <AuthInput
            label="Email"
            value={email}
            onChangeText={handleEmailChange}
            error={emailError}
            placeholder="you@example.com"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <View style={styles.inputSpacing}>
            <AuthInput
              label="Password"
              value={password}
              onChangeText={handlePasswordChange}
              error={passwordError}
              placeholder="••••••••"
              secureTextEntry
              returnKeyType="done"
              ref={passwordRef}
              onSubmitEditing={handleSubmit}
            />
          </View>

          <PrimaryButton
            label="Sign In"
            onPress={handleSubmit}
            isLoading={isLoading}
            style={styles.submitButton}
          />

          {apiError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorCardText}>{apiError}</Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
  },
  backButtonWrapper: {
    zIndex: 10,
    alignSelf: 'flex-start',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: SPACING.sm,
  },

  backArrow: {
    fontSize: 24,
    color: COLORS.primary,
  },
  headline: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  inputSpacing: {
    marginTop: SPACING.md,
  },
  submitButton: {
    marginTop: SPACING.xl,
  },
  errorCard: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.errorSurface,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorCardText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
