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

type Props = StackScreenProps<RootStackParamList, 'Register'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length === 0) return 0;
  if (password.length >= 8 && /\d/.test(password)) return 3;
  if (password.length >= 6) return 2;
  return 1;
}

const STRENGTH_COLORS: Record<1 | 2 | 3, string> = {
  1: '#ef5350',
  2: '#ffb74d',
  3: '#4db6ac',
};

export default function RegisterScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
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

  const handleConfirmChange = (text: string) => {
    setConfirmPassword(text);
    setConfirmPasswordError(null);
    setApiError(null);
  };

  const validate = (): boolean => {
    let hasError = false;
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }
    if (password.length < 8 || !/\d/.test(password)) {
      setPasswordError('Password must be 8+ characters and include a number');
      hasError = true;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }
    return !hasError;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await apiClient.post('/auth/register', {
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
        if (
          status === 400 &&
          (error.response.data?.detail?.toLowerCase().includes('already') ||
            error.response.data?.detail?.toLowerCase().includes('exists'))
        ) {
          setApiError('An account with this email already exists. Try signing in.');
        } else {
          setApiError('Registration failed. Please try again.');
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

  const strength = getPasswordStrength(password);

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

          <Text style={styles.headline}>Create account</Text>
          <Text style={styles.subtitle}>Start your wellness journey</Text>

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
              returnKeyType="next"
              ref={passwordRef}
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
          </View>

          {/* Password strength indicator */}
          <View style={styles.strengthRow}>
            {[1, 2, 3].map((bar) => (
              <View
                key={bar}
                style={[
                  styles.strengthBar,
                  bar === 3 && styles.strengthBarLast,
                  {
                    backgroundColor:
                      strength >= bar && strength > 0
                        ? STRENGTH_COLORS[strength as 1 | 2 | 3]
                        : COLORS.border,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.inputSpacing}>
            <AuthInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={handleConfirmChange}
              error={confirmPasswordError}
              placeholder="••••••••"
              secureTextEntry
              returnKeyType="done"
              ref={confirmRef}
              onSubmitEditing={handleSubmit}
            />
          </View>

          <PrimaryButton
            label="Create Account"
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
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
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
  strengthRow: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  strengthBarLast: {
    marginRight: 0,
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
