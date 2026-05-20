import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { SPACING, RADIUS, AppTheme } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Welcome'>;

const fadeSlideIn = (anim: Animated.Value) =>
  Animated.timing(anim, {
    toValue: 1,
    duration: 500,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  });

const animatedStyle = (anim: Animated.Value) => ({
  opacity: anim,
  transform: [
    {
      translateY: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
      }),
    },
  ],
});

export default function WelcomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const animAppName = useRef(new Animated.Value(0)).current;
  const animHero = useRef(new Animated.Value(0)).current;
  const animSubtitle = useRef(new Animated.Value(0)).current;
  const animButtons = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      fadeSlideIn(animAppName),
      fadeSlideIn(animHero),
      fadeSlideIn(animSubtitle),
      fadeSlideIn(animButtons),
    ]).start();
  }, [animAppName, animHero, animSubtitle, animButtons]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#004d40', '#00897b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.decorativeCircle} pointerEvents="none" />

        <View style={styles.content}>
          <Animated.View style={animatedStyle(animAppName)}>
            <Text style={styles.appName}>MindCare</Text>
          </Animated.View>

          <View style={styles.middleSection}>
            <Animated.View style={animatedStyle(animHero)}>
              <Text style={styles.headline}>Your mental health, simplified.</Text>
            </Animated.View>
            <Animated.View style={animatedStyle(animSubtitle)}>
              <Text style={styles.subtitle}>
                A private space to check in with yourself every day.
              </Text>
            </Animated.View>
          </View>

          <Animated.View style={animatedStyle(animButtons)}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>

            <View style={styles.buttonGap} />

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.75}
            >
              <Text style={styles.outlineButtonText}>I already have an account</Text>
            </TouchableOpacity>

            <View style={styles.footerGap} />

            <Text style={styles.footer}>You are not alone.</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#004d40',
  },
  gradient: {
    flex: 1,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -60,
    zIndex: 0,
  },
  content: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    justifyContent: 'space-between',
  },
  appName: {
    fontSize: 13,
    color: '#fff',
    letterSpacing: 3,
    fontWeight: '300',
    textTransform: 'uppercase',
    marginTop: SPACING.xxl,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 38,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 46,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 24,
    marginTop: SPACING.md,
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#fff',
    borderRadius: RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.primary,
  },
  buttonGap: {
    height: SPACING.md,
  },
  outlineButton: {
    height: 52,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  footerGap: {
    height: SPACING.lg,
  },
  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
});
