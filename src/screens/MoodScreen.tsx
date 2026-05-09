import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import apiClient from '../api/client';
import OfflineBanner from '../components/OfflineBanner';
import ErrorMessage from '../components/ErrorMessage';
import LoadingButton from '../components/LoadingButton';

export default function MoodScreen({ navigation }: any) {
  const [moodScore, setMoodScore] = useState(5);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getThumbColor = (score: number) => {
    if (score <= 3) return '#ef5350';
    if (score <= 6) return '#ffb74d';
    return '#4db6ac';
  };

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <OfflineBanner />
      <Text style={styles.header}>How are you feeling today?</Text>
      <Text style={styles.subtext}>This takes 10 seconds</Text>

      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreText, { color: getThumbColor(moodScore) }]}>
          {moodScore}
        </Text>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={moodScore}
          onValueChange={setMoodScore}
          minimumTrackTintColor="#4db6ac"
          maximumTrackTintColor="#b2dfdb"
          thumbTintColor={getThumbColor(moodScore)}
        />
        <View style={styles.labelsContainer}>
          <Text style={styles.labelText}>Very Low 😔</Text>
          <Text style={styles.labelText}>Feeling Great 😊</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="What's on your mind? (optional)"
          placeholderTextColor="#78909c"
          multiline
          maxLength={200}
          value={note}
          onChangeText={setNote}
        />
        <Text style={styles.charCount}>{note.length}/200</Text>
      </View>

      <LoadingButton
        label="Log My Mood"
        onPress={handleSubmit}
        isLoading={isLoading}
        disabled={successMessage !== ''}
      />

      {successMessage ? (
        <Text style={styles.successText}>{successMessage}</Text>
      ) : null}
      
      {error ? (
        <ErrorMessage message={error} onRetry={handleSubmit} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0f2f1',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004d40',
    marginTop: 20,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#00695c',
    marginTop: 5,
    marginBottom: 30,
    textAlign: 'center',
  },
  scoreContainer: {
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  sliderContainer: {
    width: '100%',
    marginBottom: 40,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  labelText: {
    fontSize: 14,
    color: '#004d40',
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  textInput: {
    backgroundColor: '#e0f2f1',
    borderWidth: 1,
    borderColor: '#4db6ac',
    borderRadius: 8,
    padding: 15,
    height: 120,
    textAlignVertical: 'top',
    color: '#004d40',
    fontSize: 16,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 5,
    color: '#00695c',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#00897b',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successText: {
    color: '#388e3c',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginTop: 15,
    textAlign: 'center',
  },
});
