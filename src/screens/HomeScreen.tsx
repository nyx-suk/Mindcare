import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { useTheme } from '../hooks/useTheme';
import { RootState } from '../store';
import apiClient from '../api/client';
import { TabParamList } from '../navigation/TabNavigator';
import { SPACING, RADIUS } from '../theme/colors';
import PrimaryButton from '../components/PrimaryButton';

type Props = BottomTabScreenProps<TabParamList, 'Home'>;

interface MoodLog {
    id: number;
    mood_score: number;
    recorded_at: string;
}

export default function HomeScreen({ navigation }: Props) {
    const { theme } = useTheme();
    const user = useSelector((state: RootState) => state.auth.user);
    const latestScore = useSelector((state: RootState) => state.assessments.latestScore);

    const [moodHistory, setMoodHistory] = useState<MoodLog[]>([]);
    const [isLoadingMood, setIsLoadingMood] = useState(false);

    useEffect(() => {
        // Fetch mood history
        const fetchMood = async () => {
            setIsLoadingMood(true);
            try {
                // fetching 14 days to compute "previous 7 days" accurately
                const response = await apiClient.get('/mood/history?days=14');
                setMoodHistory(response.data);
            } catch (err) {
                // Silently ignore errors as requested
            } finally {
                setIsLoadingMood(false);
            }
        };
        fetchMood();
    }, []);

    // Greeting Logic
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    let firstName = 'Guest';
    if (user) {
        if ((user as any).name) {
            firstName = (user as any).name;
        } else if (user.email) {
            const parts = user.email.split('@');
            const namePart = parts[0];
            firstName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }
    }

    // Severity Logic
    const getSeverity = (score: number) => {
        if (score < 5) return { label: 'Min', color: theme.success };
        if (score < 10) return { label: 'Mild', color: theme.success };
        if (score < 15) return { label: 'Moderate', color: theme.warning };
        return { label: 'Severe', color: theme.error };
    };

    // Mood Stats Logic
    let avgMood = 0;
    let prevAvgMood = 0;
    let moodTrend = 0;
    let sparklineMoods: number[] = [];

    if (moodHistory.length > 0) {
        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        const currentWeekLogs = moodHistory.filter(m => new Date(m.recorded_at) >= sevenDaysAgo);
        const previousWeekLogs = moodHistory.filter(m => new Date(m.recorded_at) < sevenDaysAgo);

        if (currentWeekLogs.length > 0) {
            avgMood = currentWeekLogs.reduce((acc, curr) => acc + curr.mood_score, 0) / currentWeekLogs.length;
        }
        if (previousWeekLogs.length > 0) {
            prevAvgMood = previousWeekLogs.reduce((acc, curr) => acc + curr.mood_score, 0) / previousWeekLogs.length;
        }

        moodTrend = avgMood - prevAvgMood;

        // Fill sparkline. At most 7.
        sparklineMoods = currentWeekLogs.slice(0, 7).reverse().map(m => m.mood_score);
        while (sparklineMoods.length < 7) {
            sparklineMoods.unshift(0); // empty days
        }
    }

    const styles = StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },
        container: {
            flexGrow: 1,
            paddingBottom: SPACING.xxl,
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingHorizontal: SPACING.xl,
            paddingTop: SPACING.lg,
            marginBottom: SPACING.lg,
        },
        greetingText: {
            fontSize: 13,
            color: theme.textSecondary,
            marginBottom: 2,
        },
        nameText: {
            fontSize: 24,
            fontWeight: '700',
            color: theme.textPrimary,
        },
        card: {
            backgroundColor: theme.surface,
            borderRadius: RADIUS.card,
            padding: SPACING.md,
            marginHorizontal: SPACING.xl,
            marginBottom: SPACING.lg,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
        },
        cardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: SPACING.sm,
        },
        cardTitle: {
            fontSize: 11,
            textTransform: 'uppercase',
            color: theme.textHint,
            fontWeight: '600',
            letterSpacing: 0.5,
        },
        retakeButton: {
            color: theme.primaryLight,
            fontSize: 12,
            fontWeight: '600',
        },
        scoreRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: SPACING.sm,
        },
        scoreLabel: {
            fontSize: 14,
            color: theme.textPrimary,
            fontWeight: '500',
        },
        scoreValue: {
            fontSize: 14,
            fontWeight: '700',
        },
        relativeTime: {
            fontSize: 12,
            color: theme.textSecondary,
            marginTop: SPACING.md,
        },
        emptyCardText: {
            fontSize: 14,
            color: theme.textSecondary,
            marginBottom: SPACING.md,
            textAlign: 'center',
        },
        avgMoodText: {
            fontSize: 32,
            fontWeight: '800',
            color: theme.primaryLight,
        },
        trendRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 4,
        },
        trendText: {
            fontSize: 13,
            fontWeight: '600',
        },
        sparklineContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            height: 40,
            marginTop: SPACING.md,
            gap: 8,
        },
        sparklineBar: {
            width: 4,
            backgroundColor: theme.primary,
            borderRadius: 2,
        },
        sparklineBg: {
            width: 4,
            height: 40,
            backgroundColor: theme.border,
            borderRadius: 2,
            overflow: 'hidden',
            justifyContent: 'flex-end',
        },
        actionRow: {
            paddingHorizontal: SPACING.xl,
            marginTop: SPACING.sm,
            gap: SPACING.md,
        }
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.greetingText}>{greeting},</Text>
                        <Text style={styles.nameText}>{firstName}</Text>
                    </View>
                    <TouchableOpacity onPress={() => console.log('Navigate to settings')}>
                        <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Assessment Card */}
                <View style={styles.card}>
                    {latestScore ? (
                        <>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>Last Assessment</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Assessment')}>
                                    <Text style={styles.retakeButton}>Retake</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Depression</Text>
                                <Text style={[styles.scoreValue, { color: getSeverity(latestScore.depression).color }]}>
                                    {latestScore.depression} ({getSeverity(latestScore.depression).label})
                                </Text>
                            </View>

                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Anxiety</Text>
                                <Text style={[styles.scoreValue, { color: getSeverity(latestScore.anxiety).color }]}>
                                    {latestScore.anxiety} ({getSeverity(latestScore.anxiety).label})
                                </Text>
                            </View>

                            <Text style={styles.relativeTime}>Recently</Text>
                        </>
                    ) : (
                        <View style={{ alignItems: 'center', paddingVertical: SPACING.sm }}>
                            <Text style={styles.emptyCardText}>No assessments yet</Text>
                            {/* @ts-ignore */}
                            <PrimaryButton
                                label="Start your first"
                                onPress={() => navigation.navigate('Assessment')}
                            />
                        </View>
                    )}
                </View>

                {/* Weekly Mood Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Weekly Mood</Text>
                        {isLoadingMood && <ActivityIndicator size="small" color={theme.primaryLight} />}
                    </View>

                    {moodHistory.length > 0 ? (
                        <>
                            <Text style={styles.avgMoodText}>{avgMood.toFixed(1)}</Text>
                            <View style={styles.trendRow}>
                                <Text style={[
                                    styles.trendText,
                                    { color: moodTrend >= 0 ? theme.success : theme.error }
                                ]}>
                                    {moodTrend >= 0 ? '↑' : '↓'} {Math.abs(moodTrend).toFixed(1)} from {prevAvgMood > 0 ? prevAvgMood.toFixed(1) : '—'}
                                </Text>
                            </View>

                            <View style={styles.sparklineContainer}>
                                {sparklineMoods.map((score, index) => (
                                    <View key={`sparkline-${index}`} style={styles.sparklineBg}>
                                        {score > 0 && (
                                            <View style={[styles.sparklineBar, { height: `${(score / 10) * 100}%` }]} />
                                        )}
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <View style={{ alignItems: 'center', paddingVertical: SPACING.sm }}>
                            {!isLoadingMood && (
                                <>
                                    <Text style={styles.emptyCardText}>No mood logs yet</Text>
                                    {/* @ts-ignore */}
                                    <PrimaryButton
                                        label="Log now"
                                        variant="outline"
                                        onPress={() => navigation.navigate('Mood')}
                                    />
                                </>
                            )}
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    {/* @ts-ignore */}
                    <PrimaryButton
                        label="Start Assessment"
                        onPress={() => navigation.navigate('Assessment')}
                    />
                    {/* @ts-ignore */}
                    <PrimaryButton
                        label="Log Today's Mood"
                        variant="outline"
                        onPress={() => navigation.navigate('Mood')}
                    />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
