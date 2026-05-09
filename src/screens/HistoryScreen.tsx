import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import apiClient from '../api/client';
import { getSeverityLabel } from '../services/scoring';
import OfflineBanner from '../components/OfflineBanner';
import ErrorMessage from '../components/ErrorMessage';
import LoadingButton from '../components/LoadingButton';

const { width: screenWidth } = Dimensions.get('window');

interface AssessmentRecord {
  id: number;
  depression_score: number;
  anxiety_score: number;
  created_at: string;
}

const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
};

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<AssessmentRecord[]>('/assessments/history?days=30');
      setRecords(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Unable to load assessment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Minimal': return '#4db6ac';
      case 'Mild': return '#fff176';
      case 'Moderate': return '#ffb74d';
      case 'Moderately Severe':
      case 'Severe': return '#ef5350';
      default: return '#4db6ac';
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#00897b" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <OfflineBanner />
        <ErrorMessage message={error} onRetry={fetchHistory} />
      </View>
    );
  }

  if (records.length < 2) {
    return (
      <View style={styles.container}>
        <OfflineBanner />
        <View style={styles.centeredContent}>
          <Text style={styles.emptyTitle}>Complete more assessments to see your trend</Text>
          <Text style={styles.emptySubtitle}>Your history will appear here after two or more assessments.</Text>
          <LoadingButton 
            label="Take Assessment" 
            onPress={() => navigation.navigate('Assessment')} 
            isLoading={false} 
            style={styles.emptyButton} 
          />
        </View>
      </View>
    );
  }

  const recentRecord = records[records.length - 1];
  const depressionSeverity = getSeverityLabel(recentRecord.depression_score, 'depression');
  const anxietySeverity = getSeverityLabel(recentRecord.anxiety_score, 'anxiety');

  const chartData = {
    labels: records.map(record => formatDateLabel(record.created_at)),
    datasets: [
      {
        data: records.map(record => record.depression_score),
        color: () => '#ef5350',
        strokeWidth: 2,
      },
      {
        data: records.map(record => record.anxiety_score),
        color: () => '#42a5f5',
        strokeWidth: 2,
      },
    ],
    legend: ['Depression', 'Anxiety'],
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <OfflineBanner />
      <Text style={styles.title}>Assessment History</Text>

      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={260}
          yAxisSuffix=""
          fromZero
          yLabelsOffset={10}
          segments={5}
          formatYLabel={(y) => Math.round(Number(y)).toString()}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 77, 64, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#ffffff',
            },
            propsForBackgroundLines: {
              strokeWidth: 1,
              stroke: '#e0e0e0',
              strokeDasharray: '', // solid lines
            }
          }}
          bezier
          style={styles.chart}
          withShadow={false}
          xLabelsOffset={10}
          hidePointsAtIndex={records.length > 7 ? records.map((_, i) => i % 2 !== 0 ? i : -1).filter(i => i !== -1) : []}
        />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Most Recent Scores</Text>
        <View style={styles.scoreRow}>
          <View style={[styles.scoreItem, { borderLeftColor: getSeverityColor(depressionSeverity) }]}>
            <Text style={styles.scoreLabel}>Depression</Text>
            <Text style={styles.scoreValue}>{recentRecord.depression_score}</Text>
            <Text style={[styles.severityText, { color: getSeverityColor(depressionSeverity) }]}>{depressionSeverity}</Text>
          </View>
          <View style={[styles.scoreItem, { borderLeftColor: getSeverityColor(anxietySeverity) }]}>
            <Text style={styles.scoreLabel}>Anxiety</Text>
            <Text style={styles.scoreValue}>{recentRecord.anxiety_score}</Text>
            <Text style={[styles.severityText, { color: getSeverityColor(anxietySeverity) }]}>{anxietySeverity}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0f2f1',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#e0f2f1',
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#004d40',
    marginVertical: 20,
    textAlign: 'center',
  },
  chartWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  chart: {
    borderRadius: 8,
  },
  summaryCard: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#004d40',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreItem: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 6,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#546e7a',
    marginBottom: 10,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#004d40',
  },
  severityText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#004d40',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#00695c',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    alignSelf: 'center',
    width: '80%',
  },
});
