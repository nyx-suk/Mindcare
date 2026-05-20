import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText, Line } from 'react-native-svg';

import apiClient from '../api/client';
import { getSeverityLabel } from '../services/scoring';
import { useTheme } from '../hooks/useTheme';
import { SPACING, RADIUS } from '../theme/colors';

import OfflineBanner from '../components/OfflineBanner';
import ErrorMessage from '../components/ErrorMessage';
import PrimaryButton from '../components/PrimaryButton';

const { width: screenWidth } = Dimensions.get('window');

interface AssessmentRecord {
  id: number;
  depression_score: number;
  anxiety_score: number;
  created_at: string;
}

interface MoodRecord {
  id: number;
  mood_score: number;
  recorded_at: string;
}

const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

const generateSmoothPath = (points: { x: number, y: number }[]) => {
  if (points.length === 0) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    path += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return path;
};

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [moodHistory, setMoodHistory] = useState<MoodRecord[]>([]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<AssessmentRecord[]>('/assessments/history?days=30');
      setRecords(response.data.reverse()); // Ensure chronological if API returns desc

      const moodRes = await apiClient.get<MoodRecord[]>('/mood/history?days=7');
      setMoodHistory(moodRes.data.reverse().slice(0, 7)); // limit to 7 chronological
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Unable to load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getDepColor = (severity: string) => {
    const s = severity.toLowerCase();
    if (s.includes('mod') || s.includes('severe')) return theme.warning;
    return theme.success;
  };

  const getAnxColor = (severity: string) => {
    const s = severity.toLowerCase();
    if (s.includes('mod') || s.includes('severe')) return theme.warning;
    return theme.primaryLight;
  };

  const cardWidth = screenWidth - SPACING.md * 2;
  const chartWidth = cardWidth - SPACING.lg * 2;
  const chartHeight = 140;
  const maxY = 27;

  let depLine = '';
  let depArea = '';
  let anxLine = '';
  let anxArea = '';
  let xLabels: any[] = [];

  if (records.length >= 2) {
    const xStep = chartWidth / (records.length - 1);

    const getPoint = (val: number, i: number) => ({
      x: i * xStep,
      y: chartHeight - Math.min((val / maxY) * chartHeight, chartHeight)
    });

    const depPoints = records.map((r, i) => getPoint(r.depression_score, i));
    const anxPoints = records.map((r, i) => getPoint(r.anxiety_score, i));

    depLine = generateSmoothPath(depPoints);
    depArea = `${depLine} L ${depPoints[depPoints.length - 1].x} ${chartHeight} L ${depPoints[0].x} ${chartHeight} Z`;

    anxLine = generateSmoothPath(anxPoints);
    anxArea = `${anxLine} L ${anxPoints[anxPoints.length - 1].x} ${chartHeight} L ${anxPoints[0].x} ${chartHeight} Z`;

    xLabels = records.map((r, i) => ({
      label: formatDateLabel(r.created_at),
      x: getPoint(0, i).x,
      show: i % 2 === 0 || i === records.length - 1
    }));
  }

  const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: SPACING.xxl },

    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.lg,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    headerPill: {
      backgroundColor: 'rgba(77, 182, 172, 0.12)', // theme.primaryLight 0.12
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    headerPillText: {
      color: theme.primaryLight,
      fontSize: 11,
      fontWeight: '600',
    },

    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: theme.border,
      marginHorizontal: SPACING.md,
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    emptyCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: theme.border,
      marginHorizontal: SPACING.md,
      padding: SPACING.xl,
      marginBottom: SPACING.lg,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: SPACING.md,
      marginBottom: SPACING.lg,
      lineHeight: 20,
    },

    chartArea: {
      height: chartHeight + 20,
      width: chartWidth,
    },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: SPACING.xl,
      marginTop: SPACING.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendLineSolid: {
      width: 14,
      height: 2,
      backgroundColor: theme.warning,
    },
    legendLineDashed: {
      width: 14,
      height: 2,
      borderTopWidth: 2,
      borderTopColor: theme.primaryLight,
      borderStyle: 'dashed',
    },
    legendText: {
      fontSize: 11,
      color: theme.textSecondary,
    },

    grid: {
      flexDirection: 'row',
      marginHorizontal: SPACING.md,
      gap: SPACING.md,
      marginBottom: SPACING.xl,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: SPACING.md,
    },
    statLabel: {
      fontSize: 11,
      textTransform: 'uppercase',
      color: theme.textHint,
      fontWeight: '600',
      marginBottom: SPACING.sm,
    },
    statScore: {
      fontSize: 32,
      fontWeight: '700',
      marginBottom: SPACING.sm,
    },
    statPillRow: {
      flexDirection: 'row',
    },
    statPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    statPillText: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
    },

    moodSection: {
      paddingHorizontal: SPACING.xl,
    },
    moodHeader: {
      fontSize: 14,
      color: theme.textPrimary,
      fontWeight: '600',
      marginBottom: SPACING.md,
    },
    moodRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      gap: Math.max(8, (screenWidth - (SPACING.xl * 2) - (28 * 7)) / 6),
      height: 60,
    },
    moodBarWrapper: {
      alignItems: 'center',
      width: 28,
    },
    moodBar: {
      width: 28,
      backgroundColor: theme.primary,
      borderRadius: 4,
      marginBottom: 4,
    },
    moodBarLabel: {
      fontSize: 9,
      color: theme.textHint,
    },
  });

  if (loading && records.length === 0) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={theme.primaryLight} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <OfflineBanner />
        <View style={{ padding: SPACING.lg }}>
          <ErrorMessage message={error} onRetry={fetchHistory} />
        </View>
      </SafeAreaView>
    );
  }

  const renderCurrentStats = () => {
    if (records.length === 0) return null;
    const latest = records[records.length - 1];
    const depSev = getSeverityLabel(latest.depression_score, 'depression');
    const anxSev = getSeverityLabel(latest.anxiety_score, 'anxiety');
    const depColor = getDepColor(depSev);
    const anxColor = getAnxColor(anxSev);

    return (
      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Depression</Text>
          <Text style={[styles.statScore, { color: depColor }]}>{latest.depression_score}</Text>
          <View style={styles.statPillRow}>
            <View style={[styles.statPill, { backgroundColor: `${depColor}1A` }]}>
              <Text style={[styles.statPillText, { color: depColor }]}>{depSev}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Anxiety</Text>
          <Text style={[styles.statScore, { color: anxColor }]}>{latest.anxiety_score}</Text>
          <View style={styles.statPillRow}>
            <View style={[styles.statPill, { backgroundColor: `${anxColor}1A` }]}>
              <Text style={[styles.statPillText, { color: anxColor }]}>{anxSev}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <OfflineBanner />

        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>History</Text>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>Last 30 days</Text>
          </View>
        </View>

        {records.length >= 2 ? (
          <View style={styles.card}>
            <View style={styles.chartArea}>
              <Svg width={chartWidth} height={chartHeight + 20}>
                <Defs>
                  <LinearGradient id="gradDep" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={theme.warning} stopOpacity="0.3" />
                    <Stop offset="1" stopColor={theme.warning} stopOpacity="0" />
                  </LinearGradient>
                  <LinearGradient id="gradAnx" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={theme.primaryLight} stopOpacity="0.2" />
                    <Stop offset="1" stopColor={theme.primaryLight} stopOpacity="0" />
                  </LinearGradient>
                </Defs>

                {/* Base Grid lines (optional flair but requested nothing here, sticking strictly to lines) */}
                <Line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke={theme.border} strokeWidth="1" />

                <Path d={depArea} fill="url(#gradDep)" />
                <Path d={anxArea} fill="url(#gradAnx)" />

                <Path d={anxLine} fill="none" stroke={theme.primaryLight} strokeWidth="2" strokeDasharray="4 3" />
                <Path d={depLine} fill="none" stroke={theme.warning} strokeWidth="2" />

                {xLabels.map((xl, idx) => xl.show && (
                  <SvgText
                    key={idx}
                    x={xl.x}
                    y={chartHeight + 16}
                    fontSize="9"
                    fill={theme.textHint}
                    textAnchor={idx === 0 ? "start" : idx === xLabels.length - 1 ? "end" : "middle"}
                  >
                    {xl.label}
                  </SvgText>
                ))}
              </Svg>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={styles.legendLineSolid} />
                <Text style={styles.legendText}>Depression</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendLineDashed} />
                <Text style={styles.legendText}>Anxiety</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="analytics-outline" size={48} color={theme.textHint} />
            <Text style={styles.emptyText}>Complete more assessments to see your trend</Text>
            {/* @ts-ignore */}
            <PrimaryButton
              label="Take Assessment"
              onPress={() => navigation.navigate('MainTabs', { screen: 'Assessment' })}
            />
          </View>
        )}

        {renderCurrentStats()}

        {moodHistory.length > 0 && (
          <View style={styles.moodSection}>
            <Text style={styles.moodHeader}>Recent Mood</Text>
            <View style={styles.moodRow}>
              {moodHistory.map((m, i) => (
                <View key={m.id || i} style={styles.moodBarWrapper}>
                  <View style={[styles.moodBar, { height: (m.mood_score / 10) * 48 }]} />
                  <Text style={styles.moodBarLabel}>{m.mood_score}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
