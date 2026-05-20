import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppTheme } from '../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ScoreRingProps {
    score: number;
    maxScore: number;
    color: string;
    size?: number;
    strokeWidth?: number;
    label: string;
    severity: string;
    theme: AppTheme;
}

export default function ScoreRing({
    score,
    maxScore,
    color,
    size = 100,
    strokeWidth = 8,
    label,
    severity,
    theme,
}: ScoreRingProps) {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [animatedValue]);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(score / maxScore, 1));
    const targetOffset = circumference * (1 - progress);

    const strokeDashoffset = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, targetOffset],
    });

    const getSeverityStyle = (sev: string) => {
        const s = sev.toLowerCase().trim();
        if (s.includes('mod')) {
            return { bg: theme.warningSurface, text: theme.warning };
        }
        if (s.includes('severe')) {
            return { bg: theme.errorSurface, text: theme.error };
        }
        // Minimal or Mild or safe default
        // we use hex alpha '1A' for ~10% opacity, given theme.success is a hex string
        return { bg: theme.success + '1A', text: theme.success };
    };

    const { bg: sevBg, text: sevText } = getSeverityStyle(severity);

    const styles = StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: 10,
        },
        svgContainer: {
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
        },
        innerCircleText: {
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
        },
        scoreText: {
            fontSize: 22,
            fontWeight: '700',
            color: theme.textPrimary,
        },
        maxScoreText: {
            fontSize: 11,
            color: theme.textSecondary,
        },
        labelWrapper: {
            alignItems: 'center',
            marginTop: 12,
        },
        labelText: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.textPrimary,
            marginBottom: 6,
        },
        severityPill: {
            backgroundColor: sevBg,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 16,
        },
        severityText: {
            color: sevText,
            fontSize: 11,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
    });

    return (
        <View style={styles.container}>
            <View style={styles.svgContainer}>
                <Svg width={size} height={size}>
                    {/* Background Track */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={theme.border}
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Animated Progress Ring */}
                    <AnimatedCircle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        originX={size / 2}
                        originY={size / 2}
                        rotation="-90"
                    />
                </Svg>

                <View style={styles.innerCircleText}>
                    <Text style={styles.scoreText}>{score}</Text>
                    <Text style={styles.maxScoreText}>/ {maxScore}</Text>
                </View>
            </View>

            <View style={styles.labelWrapper}>
                <Text style={styles.labelText}>{label}</Text>
                <View style={styles.severityPill}>
                    <Text style={styles.severityText}>{severity}</Text>
                </View>
            </View>
        </View>
    );
}
