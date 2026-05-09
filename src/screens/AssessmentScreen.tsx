import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { answerQuestion, setLatestScore } from '../store/assessmentSlice';
import apiClient from '../api/client';
import { RootState } from '../store';
import { computeScores } from '../services/scoring';
import OfflineBanner from '../components/OfflineBanner';
import ErrorMessage from '../components/ErrorMessage';
import LoadingButton from '../components/LoadingButton';

export default function AssessmentScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const currentAnswers = useSelector((state: RootState) => state.assessments.currentAnswers);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReflectionInput, setShowReflectionInput] = useState(false);
  const [pendingFinalAnswer, setPendingFinalAnswer] = useState<{ questionId: string; score: number } | null>(null);
  const [userText, setUserText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await apiClient.get('/assessments/questions');
      setQuestions(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (score: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    dispatch(answerQuestion({ questionId: currentQuestion.id, score }));

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        setPendingFinalAnswer({ questionId: currentQuestion.id, score });
        setShowReflectionInput(true);
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 0);
      }
    });
  };

  const submitAssessment = async () => {
    setSubmitting(true);
    try {
      const finalAnswers = {
        ...currentAnswers,
        ...(pendingFinalAnswer ? { [pendingFinalAnswer.questionId]: pendingFinalAnswer.score } : {}),
      };
      const scores = computeScores(finalAnswers, questions);
      const answers: { questionId: string; value: number }[] = Object.entries(finalAnswers).map(([questionId, value]) => ({ questionId, value }));

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
          // If ML call fails, silently skip it.
        }
      }

      dispatch(setLatestScore({ anxiety: scores.anxiety, depression: scores.depression, answers }));
      navigation.replace('Results', { mlResult });
    } catch (error) {
      Alert.alert('Error', 'Failed to submit assessment results.');
      setSubmitting(false);
    }
  };

  const getProgressWidth = () => {
    if (questions.length === 0) return '0%';
    return `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4db6ac" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { padding: 20 }]}>
        <OfflineBanner />
        <ErrorMessage message={error} onRetry={fetchQuestions} />
      </View>
    );
  }

  if (submitting) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4db6ac" />
        <Text style={styles.submittingText}>Analyzing your results...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>No questions available.</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: getProgressWidth() as any }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          {showReflectionInput ? (
            <View>
              <Text style={styles.questionCounter}>Final Step</Text>
              <Text style={styles.questionText}>In a few words, how have you been feeling lately?</Text>
              <TextInput
                style={styles.textInput}
                value={userText}
                onChangeText={setUserText}
                placeholder="Share anything you’d like us to know..."
                multiline
                maxLength={200}
                textAlignVertical="top"
                returnKeyType="done"
              />
              <Text style={styles.charCount}>{userText.length}/200</Text>
              <LoadingButton 
                label="Submit Assessment" 
                onPress={submitAssessment} 
                isLoading={submitting} 
                style={{ marginTop: 10 }}
              />
            </View>
          ) : (
            <>
              <Text style={styles.questionCounter}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </Text>
              <Text style={styles.questionText}>{currentQuestion.text}</Text>

              <View style={styles.likertContainer}>
                {currentQuestion.options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.likertButton}
                    onPress={() => handleAnswer(option.value)}
                  >
                    <Text style={styles.likertText}>{option.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.labelsContainer}>
                {currentQuestion.options.map((option) => (
                  <Text key={option.value} style={styles.labelText}>{option.label}</Text>
                ))}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressContainer: { height: 6, backgroundColor: '#e0e0e0', width: '100%' },
  progressBar: { height: '100%', backgroundColor: '#4db6ac' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  submittingText: { marginTop: 16, fontSize: 16, color: '#4db6ac', fontWeight: '500' },
  questionCounter: { fontSize: 14, color: '#757575', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  questionText: { fontSize: 24, color: '#263238', fontWeight: '500', marginBottom: 24, lineHeight: 32 },
  textInput: { minHeight: 120, backgroundColor: '#ffffff', borderRadius: 12, padding: 16, fontSize: 16, color: '#263238', borderWidth: 1, borderColor: '#cfd8dc', marginBottom: 8 },
  charCount: { fontSize: 12, color: '#757575', marginBottom: 24, textAlign: 'right' },
  submitReflectionButton: { backgroundColor: '#00897b', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitReflectionText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  likertContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  likertButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  likertText: { fontSize: 18, fontWeight: '600', color: '#00897b' },
  labelsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  labelText: { fontSize: 12, color: '#9e9e9e' },
});
