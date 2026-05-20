import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { answerQuestion, setLatestScore } from '../store/assessmentSlice';
import apiClient from '../api/client';
import { RootState } from '../store';
import { computeScores } from '../services/scoring';
import { useTheme } from '../hooks/useTheme';
import { SPACING, RADIUS } from '../theme/colors';

import OfflineBanner from '../components/OfflineBanner';
import ErrorMessage from '../components/ErrorMessage';
import LoadingButton from '../components/LoadingButton';
import PrimaryButton from '../components/PrimaryButton';

export default function AssessmentScreen({ navigation }: any) {
  const { theme } = useTheme();
  const dispatch = useDispatch();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const progressAnim = useRef(new Animated.Value(0)).current;

  // New strict Array state
  const [answers, setAnswers] = useState<{ questionId: string; value: number }[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReflectionInput, setShowReflectionInput] = useState(false);
  const [userText, setUserText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0 && !showReflectionInput) {
      Animated.timing(progressAnim, {
        toValue: (currentQuestionIndex + 1) / questions.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentQuestionIndex, questions.length, showReflectionInput]);

  const fetchQuestions = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await apiClient.get('/assessments/questions');
      setQuestions(response.data);
      if (response.data.length > 0) {
        progressAnim.setValue(1 / response.data.length);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (score: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === currentQuestion.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { questionId: currentQuestion.id, value: score };
        return updated;
      }
      return [...prev, { questionId: currentQuestion.id, value: score }];
    });
  };

  const handleNextOrSubmit = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const hasAnswered = answers.some(a => a.questionId === currentQuestion.id);
    if (!hasAnswered) return;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      } else {
        setShowReflectionInput(true);
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start();
        }, 0);
      }
    });
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const submitAssessment = async () => {
    setSubmitting(true);
    try {
      // Pass answers (Array) directly to computeScores
      const scores = computeScores(answers, questions);

      await apiClient.post('/assessments', {
        anxiety_score: scores.anxiety,
        depression_score: scores.depression,
      });

      let mlResult = null;
      if (userText.trim()) {
        try {
          const mlResponse = await apiClient.post('/ml/classify', { text: userText.trim() });
          if (mlResponse?.data && mlResponse.data.label) {
            mlResult = {
              label: mlResponse.data.label,
              confidence: mlResponse.data.confidence,
            };
          }
        } catch (error) {
          // Silent skip
        }
      }

      dispatch(setLatestScore({ anxiety: scores.anxiety, depression: scores.depression, answers }));
      navigation.replace('Results', { mlResult });
    } catch (error) {
      Alert.alert('Error', 'Failed to submit assessment results.');
      setSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
    },
    headerSpace: { flex: 1 },
    questionCounterText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500',
    },

    progressOuter: {
      height: 3,
      backgroundColor: theme.border,
      borderRadius: 2,
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.md,
      overflow: 'hidden',
    },
    progressInner: {
      height: '100%',
      backgroundColor: theme.primary,
    },

    scrollContent: { flexGrow: 1, paddingBottom: SPACING.xxl },
    questionCard: {
      marginHorizontal: SPACING.md,
      marginTop: SPACING.lg,
      marginBottom: SPACING.lg,
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 0.5,
      padding: SPACING.xl,
    },
    chip: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
    },
    chipText: {
      fontSize: 10,
      fontWeight: '500',
    },
    chipDepression: {
      backgroundColor: theme.warningSurface,
    },
    chipDepressionText: {
      color: theme.warning,
    },
    chipAnxiety: {
      backgroundColor: 'rgba(77, 182, 172, 0.12)',
    },
    chipAnxietyText: {
      color: theme.primaryLight,
    },
    questionText: {
      fontSize: 16,
      color: theme.textPrimary,
      fontWeight: '500',
      lineHeight: 24,
      marginTop: SPACING.md,
    },

    optionsContainer: {
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.xl,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: SPACING.lg,
      borderRadius: 12,
      marginBottom: SPACING.sm,
      borderWidth: 0.5,
    },
    optionRowUnselected: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    optionRowSelected: {
      backgroundColor: 'rgba(0,137,123,0.15)',
      borderColor: theme.primary,
    },
    optionIndicator: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginRight: SPACING.md,
    },
    indicatorUnselected: {
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: 'transparent',
    },
    indicatorSelected: {
      backgroundColor: theme.primary,
      borderWidth: 0,
    },
    optionText: {
      fontSize: 14,
    },
    optionTextUnselected: {
      color: theme.textSecondary,
      fontWeight: '400',
    },
    optionTextSelected: {
      color: theme.primaryLight,
      fontWeight: '500',
    },

    navRow: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.lg,
      gap: SPACING.md,
    },

    reflectionContainer: {
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.xl,
    },
    reflectionTitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: SPACING.md,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '600'
    },
    reflectionPrompt: {
      fontSize: 24,
      color: theme.textPrimary,
      fontWeight: '500',
      marginBottom: SPACING.xl,
      lineHeight: 32
    },
    textInput: {
      minHeight: 120,
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.textPrimary,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 8,
    },
    charCount: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 24,
      textAlign: 'right'
    },
    submittingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.primaryLight,
      fontWeight: '500'
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primaryLight} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered, { padding: 20 }]}>
        <OfflineBanner />
        <ErrorMessage message={error} onRetry={fetchQuestions} />
      </SafeAreaView>
    );
  }

  if (submitting) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primaryLight} />
        <Text style={styles.submittingText}>Analyzing your results...</Text>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <Text style={{ color: theme.textPrimary }}>No questions available.</Text>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isSelected = (value: number) => answers.some(a => a.questionId === currentQuestion.id && a.value === value);
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasAnsweredCurrent = answers.some(a => a.questionId === currentQuestion.id);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner />

      {!showReflectionInput && (
        <>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerSpace} />
            <Text style={styles.questionCounterText}>{currentQuestionIndex + 1} / {questions.length}</Text>
          </View>

          <View style={styles.progressOuter}>
            <Animated.View style={[styles.progressInner, { width: progressWidth }]} />
          </View>
        </>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          {showReflectionInput ? (
            <View style={styles.reflectionContainer}>
              <Text style={styles.reflectionTitle}>Final Step</Text>
              <Text style={styles.reflectionPrompt}>In a few words, how have you been feeling lately?</Text>
              <TextInput
                style={styles.textInput}
                value={userText}
                onChangeText={setUserText}
                placeholder="Share anything you’d like us to know..."
                placeholderTextColor={theme.textHint}
                multiline
                maxLength={200}
                textAlignVertical="top"
                returnKeyType="done"
              />
              <Text style={styles.charCount}>{userText.length}/200</Text>
              {/* @ts-ignore */}
              <LoadingButton
                label="Submit Assessment"
                onPress={submitAssessment}
                isLoading={submitting}
              />
            </View>
          ) : (
            <>
              <View style={styles.questionCard}>
                <View style={[
                  styles.chip,
                  currentQuestion.category === 'depression' ? styles.chipDepression : styles.chipAnxiety
                ]}>
                  <Text style={[
                    styles.chipText,
                    currentQuestion.category === 'depression' ? styles.chipDepressionText : styles.chipAnxietyText
                  ]}>
                    {currentQuestion.category === 'depression' ? 'Depression' : 'Anxiety'}
                  </Text>
                </View>
                <Text style={styles.questionText}>{currentQuestion.text}</Text>
              </View>

              <View style={styles.optionsContainer}>
                {currentQuestion.options.map((option: any) => {
                  const selected = isSelected(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionRow,
                        selected ? styles.optionRowSelected : styles.optionRowUnselected
                      ]}
                      onPress={() => handleOptionSelect(option.value)}
                    >
                      <View style={[
                        styles.optionIndicator,
                        selected ? styles.indicatorSelected : styles.indicatorUnselected
                      ]} />
                      <Text style={[
                        styles.optionText,
                        selected ? styles.optionTextSelected : styles.optionTextUnselected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {!showReflectionInput && (
        <View style={styles.navRow}>
          {/* @ts-ignore */}
          <PrimaryButton
            label="Previous"
            variant="outline"
            onPress={handlePrev}
            disabled={isFirstQuestion}
            style={{ flex: 1, opacity: isFirstQuestion ? 0.3 : 1 }}
          />
          {/* @ts-ignore */}
          <PrimaryButton
            label={isLastQuestion ? "Submit" : "Next"}
            onPress={handleNextOrSubmit}
            disabled={!hasAnsweredCurrent}
            style={{ flex: 1, opacity: !hasAnsweredCurrent ? 0.5 : 1 }}
          />
        </View>
      )}

    </SafeAreaView>
  );
}
