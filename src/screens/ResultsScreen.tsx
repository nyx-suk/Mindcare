import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Modal, Linking, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Localization from 'expo-localization';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { RootState } from '../store';
import { checkHighRisk, getCategoryMessage, getSeverityLabel } from '../services/scoring';
import { helplines, Helpline } from '../config/crisisHelplines';
import { useTheme } from '../hooks/useTheme';
import { SPACING } from '../theme/colors';

import ScoreRing from '../components/ScoreRing';
import OfflineBanner from '../components/OfflineBanner';
import LoadingButton from '../components/LoadingButton';
import PrimaryButton from '../components/PrimaryButton';

export default function ResultsScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const latestScore = useSelector((state: RootState) => state.assessments.latestScore);
  const mlResult = route?.params?.mlResult;
  const [modalVisible, setModalVisible] = useState(false);
  const [showOtherCountries, setShowOtherCountries] = useState(false);

  const locale = Localization.getLocales()?.[0];
  const countryCode = (locale?.regionCode || 'GLOBAL').toUpperCase();
  const primaryHelplines = helplines[countryCode] || helplines["DEFAULT"];

  const openCrisisModal = () => {
    setShowOtherCountries(false);
    setModalVisible(true);
  };

  const closeCrisisModal = () => {
    setModalVisible(false);
  };

  const dialNumber = (phone: string) => {
    const digits = phone.replace(/[^0-9+]/g, '');
    if (!digits) return;
    Linking.openURL(`tel:${digits}`);
  };

  const allHelplinesGrouped = Object.entries(helplines).map(([country, lines]) => ({
    country,
    lines,
  }));

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    // Header
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    headerDate: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    // Score Rings
    scoreRingsRow: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      marginVertical: SPACING.xl,
    },
    // Recommendations
    recommendationsContainer: {
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.xl,
      gap: SPACING.md,
    },
    recCardDepression: {
      backgroundColor: theme.surface,
      borderLeftWidth: 3,
      borderLeftColor: theme.warning,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
      padding: SPACING.lg,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    recCardAnxiety: {
      backgroundColor: theme.surface,
      borderLeftWidth: 3,
      borderLeftColor: theme.primaryLight,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
      padding: SPACING.lg,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    recLabel: {
      fontSize: 11,
      textTransform: 'uppercase',
      color: theme.textHint,
      fontWeight: '600',
      marginBottom: 6,
    },
    recText: {
      fontSize: 13,
      color: theme.textPrimary,
      lineHeight: 20,
    },
    // AI Insight
    aiCard: {
      backgroundColor: 'rgba(0,137,123,0.1)',
      borderWidth: 0.5,
      borderColor: theme.primary,
      borderRadius: 12,
      padding: SPACING.md,
      marginHorizontal: SPACING.md,
      marginBottom: SPACING.xl,
    },
    aiHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
      gap: 6,
    },
    aiLabelText: {
      fontSize: 12,
      color: theme.primaryLight,
      fontWeight: '600',
    },
    aiContentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: SPACING.sm,
    },
    aiResultText: {
      fontSize: 14,
      color: theme.textPrimary,
      flex: 1,
    },
    aiConfidenceText: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    aiDisclaimer: {
      fontSize: 10,
      color: theme.textHint,
      fontStyle: 'italic',
    },
    // Crisis Button
    crisisWrapper: {
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.lg,
    },
    crisisButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.error,
      borderRadius: 12,
      padding: SPACING.lg,
      width: '100%',
      gap: 10,
    },
    crisisButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    dashboardNavWrap: {
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.xxl,
    },
    // Legacy Modal (restyled to theme)
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: theme.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, maxHeight: '90%' },
    modalHeader: { backgroundColor: theme.error, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    modalCloseButton: { padding: 4 },
    modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 18 },
    modalBody: { padding: 20 },
    helplineCard: { backgroundColor: theme.background, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: theme.errorSurface, marginBottom: 16 },
    helplineName: { fontSize: 18, fontWeight: '700', color: theme.error, marginBottom: 6 },
    helplineDesc: { fontSize: 14, color: theme.textSecondary, marginBottom: 12 },
    callButton: { backgroundColor: theme.error, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    callButtonText: { color: '#fff', fontWeight: 'bold' },
    otherButton: { alignItems: 'center', paddingVertical: 12 },
    otherButtonText: { color: theme.primary, fontWeight: '700' },
    countryList: { maxHeight: 240, marginVertical: 10 },
    countryGroup: { marginBottom: 16 },
    countryGroupName: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 8 },
    countryItem: { flexDirection: 'row', backgroundColor: theme.background, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 8, alignItems: 'center' },
    countryName: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
    countryDetails: { fontSize: 13, color: theme.textSecondary, marginBottom: 4 },
    countryPhone: { fontSize: 15, fontWeight: '600', color: theme.primary },
    inlineCallButton: { backgroundColor: theme.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginLeft: 10 },
    inlineCallText: { color: '#fff', fontWeight: 'bold' },
    footerText: { textAlign: 'center', color: theme.primary, fontWeight: '600', marginTop: 10 },
  });

  if (!latestScore) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <OfflineBanner />
        <Text style={{ color: theme.textPrimary }}>No results found. Please take an assessment.</Text>
        <PrimaryButton
          label="Start Assessment"
          onPress={() => navigation.navigate('Assessment')}
        />
      </SafeAreaView>
    );
  }

  const isHighRisk = checkHighRisk({ anxiety: latestScore.anxiety, depression: latestScore.depression }, latestScore.answers);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <OfflineBanner />

        {/* ── HEADER ── */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
            <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Results</Text>
          <Text style={styles.headerDate}>{new Date().toLocaleDateString()}</Text>
        </View>

        {/* ── SCORE RINGS ── */}
        <View style={styles.scoreRingsRow}>
          <ScoreRing
            score={latestScore.depression}
            maxScore={27}
            color={theme.warning}
            label="Depression"
            severity={getSeverityLabel(latestScore.depression, 'depression')}
            theme={theme}
            size={120}
          />
          <ScoreRing
            score={latestScore.anxiety}
            maxScore={21}
            color={theme.primaryLight}
            label="Anxiety"
            severity={getSeverityLabel(latestScore.anxiety, 'anxiety')}
            theme={theme}
            size={120}
          />
        </View>

        {/* ── RECOMMENDATIONS ── */}
        <View style={styles.recommendationsContainer}>
          <View style={styles.recCardDepression}>
            <Text style={styles.recLabel}>Depression</Text>
            <Text style={styles.recText}>{getCategoryMessage(latestScore.depression, 'depression')}</Text>
          </View>
          <View style={styles.recCardAnxiety}>
            <Text style={styles.recLabel}>Anxiety</Text>
            <Text style={styles.recText}>{getCategoryMessage(latestScore.anxiety, 'anxiety')}</Text>
          </View>
        </View>

        {/* ── AI INSIGHT ── */}
        {mlResult && mlResult.label !== 'Unavailable' && (
          <View style={styles.aiCard}>
            <View style={styles.aiHeaderRow}>
              <Ionicons name="hardware-chip-outline" size={16} color={theme.primaryLight} />
              <Text style={styles.aiLabelText}>AI Insight</Text>
            </View>
            <View style={styles.aiContentRow}>
              <Text style={styles.aiResultText}>{mlResult.label}</Text>
              <Text style={styles.aiConfidenceText}>{Math.round(mlResult.confidence * 100)}% conf</Text>
            </View>
            <Text style={styles.aiDisclaimer}>AI-assisted, not a clinical diagnosis</Text>
          </View>
        )}

        {/* ── CRISIS BUTTON ── */}
        {isHighRisk && (
          <View style={styles.crisisWrapper}>
            <TouchableOpacity style={styles.crisisButtonContent} onPress={openCrisisModal}>
              <Ionicons name="call-outline" size={20} color="#fff" />
              <Text style={styles.crisisButtonText}>Connect to Crisis Support</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.dashboardNavWrap}>
          {/* @ts-ignore */}
          <PrimaryButton
            label="Return to Dashboard"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          />
        </View>

      </ScrollView>

      {/* ── EXISTING CRISIS MODAL ── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crisis Support</Text>
              <TouchableOpacity onPress={closeCrisisModal} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>X</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <FlatList
                data={primaryHelplines}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => (
                  <View style={styles.helplineCard}>
                    <Text style={styles.helplineName}>{item.name}</Text>
                    <Text style={styles.helplineDesc}>{item.description}</Text>
                    <TouchableOpacity style={styles.callButton} onPress={() => dialNumber(item.number)}>
                      <Text style={styles.callButtonText}>Call Now</Text>
                    </TouchableOpacity>
                  </View>
                )}
                scrollEnabled={false}
              />

              <TouchableOpacity style={styles.otherButton} onPress={() => setShowOtherCountries(!showOtherCountries)}>
                <Text style={styles.otherButtonText}>{showOtherCountries ? 'Hide other countries' : 'View all countries'}</Text>
              </TouchableOpacity>

              {showOtherCountries && (
                <FlatList
                  data={allHelplinesGrouped}
                  keyExtractor={(item) => item.country}
                  renderItem={({ item }) => (
                    <View style={styles.countryGroup}>
                      <Text style={styles.countryGroupName}>{item.country}</Text>
                      {item.lines.map(line => (
                        <View key={line.name} style={styles.countryItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.countryName}>{line.name}</Text>
                            <Text style={styles.countryDetails}>{line.description}</Text>
                            <Text style={styles.countryPhone}>{line.number}</Text>
                          </View>
                          <TouchableOpacity onPress={() => dialNumber(line.number)} style={styles.inlineCallButton}>
                            <Text style={styles.inlineCallText}>Call</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  style={styles.countryList}
                />
              )}

              <Text style={styles.footerText}>You are not alone. Help is available.</Text>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
