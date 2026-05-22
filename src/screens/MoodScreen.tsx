import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

import apiClient from '../api/client';
import OfflineBanner from '../components/OfflineBanner';
import ErrorMessage from '../components/ErrorMessage';
import LoadingButton from '../components/LoadingButton';
import { useTheme } from '../hooks/useTheme';
import { SPACING } from '../theme/colors';

export default function MoodScreen({ navigation }: any) {
  const { theme } = useTheme();

  const [moodScore, setMoodScore] = useState(5);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animate on score change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  }, [moodScore]);

  const getColorForScore = (score: number) => {
    if (score <= 3) return theme.error;
    if (score <= 6) return theme.warning;
    return theme.primaryLight;
  };

  const getLabelForScore = (score: number) => {
    if (score <= 2) return "Very low";
    if (score <= 4) return "Struggling a little";
    if (score <= 6) return "Getting by";
    if (score <= 8) return "Feeling good";
    return "Having a great day!";
  };

  const trackSegments = [
    theme.error, theme.error, theme.error,
    theme.warning, theme.warning, theme.warning,
    theme.primaryLight, theme.primaryLight, theme.primaryLight, theme.primaryLight
  ];

  const handleSubmit = async () => {
    setIsLoading(true);
    setSuccessMessage('');
    setError(null);

    try {
      await apiClient.post('/mood', {
        mood_score: moodScore,
        note: note.trim() || null,
      });

      setSuccessMessage('Mood logged! ✓');
      setMoodScore(5);
      setNote('');
      setIsLoading(false);

      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || 'Failed to log mood. Please try again.'
      );
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: SPACING.xxl,
    },
    headerOuter: {
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textPrimary,
      position: 'absolute',
      width: '100%',
      textAlign: 'center',
      zIndex: -1,
    },
    subtextRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: SPACING.md,
      gap: 4,
    },
    subtext: {
      fontSize: 12,
      color: theme.textHint,
    },

    scoreSection: {
      alignItems: 'center',
      paddingVertical: SPACING.xl,
    },
    scoreNumber: {
      fontSize: 72,
      fontWeight: '700',
    },
    scoreLabel: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 8,
    },

    sliderWrapper: {
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.lg,
      position: 'relative',
    },
    sliderTrackBg: {
      position: 'absolute',
      left: SPACING.xl + 14,
      right: SPACING.xl + 14,
      height: 6,
      top: 17,
      borderRadius: 3,
      flexDirection: 'row',
      overflow: 'hidden',
      zIndex: -1,
    },
    trackSegment: {
      flex: 1,
      height: '100%',
    },
    slider: {
      width: '100%',
      height: 40,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    sliderLabelText: {
      fontSize: 11,
      color: theme.textHint,
    },

    noteCard: {
      marginHorizontal: SPACING.md,
      marginTop: SPACING.lg,
      backgroundColor: theme.surface,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 12,
      padding: SPACING.md,
    },
    noteLabel: {
      fontSize: 11,
      color: theme.textHint,
      textTransform: 'uppercase',
      fontWeight: '600',
      marginBottom: SPACING.sm,
      letterSpacing: 0.5,
    },
    textInput: {
      backgroundColor: 'transparent',
      color: theme.textPrimary,
      fontSize: 14,
      lineHeight: 22,
      minHeight: 88,
      textAlignVertical: 'top',
    },
    charCount: {
      textAlign: 'right',
      fontSize: 11,
      color: theme.textHint,
      marginTop: SPACING.sm,
    },

    submitWrapper: {
      marginHorizontal: SPACING.md,
      marginTop: SPACING.lg,
    },
    successText: {
      color: theme.success,
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 15,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <OfflineBanner />

          {/* HEADER */}
          <View style={styles.headerOuter}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Mood Check-in</Text>
            </View>
            <View style={styles.subtextRow}>
              <Ionicons name="time-outline" size={12} color={theme.textHint} />
              <Text style={styles.subtext}>Takes 10 seconds</Text>
            </View>
          </View>

          {/* SCORE DISPLAY SECTION */}
          <View style={styles.scoreSection}>
            <Animated.Text
              style={[
                styles.scoreNumber,
                {
                  color: getColorForScore(moodScore),
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              {moodScore}
            </Animated.Text>
            <Text style={styles.scoreLabel}>{getLabelForScore(moodScore)}</Text>
          </View>

          {/* CUSTOM SLIDER TRACK */}
          <View style={styles.sliderWrapper}>
            <View style={styles.sliderTrackBg}>
              {trackSegments.map((segColor, index) => (
                <View key={index} style={[styles.trackSegment, { backgroundColor: segColor }]} />
              ))}
            </View>

            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={moodScore}
              onValueChange={setMoodScore}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primaryLight}
            />

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>1 😔</Text>
              <Text style={styles.sliderLabelText}>10 😊</Text>
            </View>
          </View>

          {/* NOTE INPUT CARD */}
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>What's on your mind?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="(Optional) Added context helps track patterns..."
              placeholderTextColor={theme.textHint}
              multiline
              numberOfLines={4}
              maxLength={200}
              value={note}
              onChangeText={setNote}
            />
            <Text style={styles.charCount}>{note.length}/200</Text>
          </View>

          {/* SUBMIT BUTTON */}
          <View style={styles.submitWrapper}>
            <LoadingButton
              label="Log My Mood"
              onPress={handleSubmit}
              isLoading={isLoading}
              disabled={successMessage !== ''}
            />
          </View>

          {successMessage ? (
            <Text style={styles.successText}>{successMessage}</Text>
          ) : null}

          {error ? (
            <View style={{ marginHorizontal: SPACING.md, marginTop: SPACING.md }}>
              <ErrorMessage message={error} onRetry={handleSubmit} />
            </View>
          ) : null}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
