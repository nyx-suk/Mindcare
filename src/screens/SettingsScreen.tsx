import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../store';
import { toggleTheme, setNotificationsEnabled, setReminderTime } from '../store/settingsSlice';
import { logoutUser } from '../store/authSlice';
import { useTheme } from '../hooks/useTheme';
import { SPACING } from '../theme/colors';

export default function SettingsScreen({ navigation }: any) {
    const { theme, themeMode } = useTheme();
    const dispatch = useDispatch<AppDispatch>();

    const { notificationsEnabled, reminderHour, reminderMinute } = useSelector((state: RootState) => state.settings);

    const [modalVisible, setModalVisible] = useState(false);
    const [tempHour, setTempHour] = useState(reminderHour);
    const [tempMinute, setTempMinute] = useState(reminderMinute);

    const formatAmPm = (hour: number) => {
        return hour < 12 ? 'AM' : 'PM';
    };

    const displayHour = (hour: number) => {
        if (hour === 0) return 12;
        if (hour > 12) return hour - 12;
        return hour;
    };

    const padMinute = (minute: number) => minute.toString().padStart(2, '0');

    const onConfirmTime = () => {
        dispatch(setReminderTime({ hour: tempHour, minute: tempMinute }));
        setModalVisible(false);
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = [0, 15, 30, 45];

    const styles = StyleSheet.create({
        safeArea: { flex: 1, backgroundColor: theme.background },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: SPACING.xl,
            paddingTop: SPACING.lg,
            paddingBottom: SPACING.lg
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.textPrimary,
            marginLeft: SPACING.md
        },
        sectionHeader: {
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.06,
            color: theme.textHint,
            marginTop: SPACING.xl,
            marginBottom: SPACING.sm,
            paddingHorizontal: SPACING.md,
            marginLeft: SPACING.md,
        },
        card: {
            backgroundColor: theme.surface,
            borderRadius: 12,
            borderColor: theme.border,
            borderWidth: 0.5,
            marginHorizontal: SPACING.md,
            overflow: 'hidden',
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: SPACING.lg,
            paddingVertical: 14,
        },
        separator: {
            borderBottomWidth: 0.5,
            borderBottomColor: theme.border,
        },
        rowLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            gap: 12,
        },
        rowIcon: {
            width: 20,
        },
        rowText: {
            fontSize: 15,
            color: theme.textPrimary,
        },
        rowTextError: {
            fontSize: 15,
            color: theme.error,
        },
        valueText: {
            color: theme.primaryLight,
            fontSize: 14,
            fontWeight: '500',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalContent: {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: SPACING.xl,
            width: '80%',
            alignItems: 'center',
        },
        pickersRow: {
            flexDirection: 'row',
            justifyContent: 'center',
            height: 150,
            width: '100%',
            marginBottom: SPACING.lg,
            gap: SPACING.md,
        },
        pickerColumn: {
            flex: 1,
        },
        pickerItemText: {
            fontSize: 18,
            paddingVertical: 8,
            textAlign: 'center',
            color: theme.textSecondary,
        },
        pickerItemSelectedText: {
            fontSize: 22,
            fontWeight: 'bold',
            color: theme.primaryLight,
            paddingVertical: 8,
            textAlign: 'center',
        },
        confirmBtn: {
            backgroundColor: theme.primary,
            paddingHorizontal: SPACING.xl,
            paddingVertical: 12,
            borderRadius: 20,
        },
        confirmBtnText: {
            color: '#ffffff',
            fontWeight: '600',
        }
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionHeader}>Appearance</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="moon-outline" size={20} color={theme.textSecondary} style={styles.rowIcon} />
                            <Text style={styles.rowText}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={themeMode === 'dark'}
                            onValueChange={() => { dispatch(toggleTheme()); }}
                            trackColor={{ false: theme.border, true: theme.primary }}
                            thumbColor={theme.surface}
                        />
                    </View>
                </View>

                <Text style={styles.sectionHeader}>Notifications</Text>
                <View style={styles.card}>
                    <View style={[styles.row, notificationsEnabled && styles.separator]}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="notifications-outline" size={20} color={theme.textSecondary} style={styles.rowIcon} />
                            <Text style={styles.rowText}>Daily check-in reminder</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={(val) => { dispatch(setNotificationsEnabled(val)); }}
                            trackColor={{ false: theme.border, true: theme.primary }}
                            thumbColor={theme.surface}
                        />
                    </View>

                    {notificationsEnabled && (
                        <TouchableOpacity
                            style={styles.row}
                            onPress={() => { setTempHour(reminderHour); setTempMinute(reminderMinute); setModalVisible(true); }}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="time-outline" size={20} color={theme.textSecondary} style={styles.rowIcon} />
                                <Text style={styles.rowText}>Reminder time</Text>
                            </View>
                            <Text style={styles.valueText}>
                                {displayHour(reminderHour)}:{padMinute(reminderMinute)} {formatAmPm(reminderHour)}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.sectionHeader}>Account</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.row} onPress={() => dispatch(logoutUser())}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="log-out-outline" size={20} color={theme.error} style={styles.rowIcon} />
                            <Text style={styles.rowTextError}>Log out</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Manual Time Picker Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>

                        <View style={styles.pickersRow}>
                            <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                                {hours.map(h => (
                                    <TouchableOpacity key={`h-${h}`} onPress={() => setTempHour(h)}>
                                        <Text style={h === tempHour ? styles.pickerItemSelectedText : styles.pickerItemText}>
                                            {displayHour(h)} {formatAmPm(h)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                                {minutes.map(m => (
                                    <TouchableOpacity key={`m-${m}`} onPress={() => setTempMinute(m)}>
                                        <Text style={m === tempMinute ? styles.pickerItemSelectedText : styles.pickerItemText}>
                                            {padMinute(m)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity style={styles.confirmBtn} onPress={onConfirmTime}>
                            <Text style={styles.confirmBtnText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}
