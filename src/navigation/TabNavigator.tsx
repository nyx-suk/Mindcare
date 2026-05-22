import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

import HomeScreen from '../screens/HomeScreen';
import AssessmentScreen from '../screens/AssessmentScreen';
import MoodScreen from '../screens/MoodScreen';
import HistoryScreen from '../screens/HistoryScreen';

export type TabParamList = {
    Home: undefined;
    Assessment: undefined;
    Mood: undefined;
    History: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
    const { theme } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.tabBar,
                    borderTopColor: theme.border,
                    borderTopWidth: 0.5,
                    height: 58,
                    paddingBottom: 6,
                },
                tabBarActiveTintColor: theme.tabBarActive,
                tabBarInactiveTintColor: theme.tabBarInactive,
                tabBarLabelStyle: {
                    fontSize: 10,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Assessment') {
                        iconName = focused ? 'clipboard' : 'clipboard-outline';
                    } else if (route.name === 'Mood') {
                        iconName = focused ? 'happy' : 'happy-outline';
                    } else if (route.name === 'History') {
                        iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    } else {
                        iconName = 'ellipse';
                    }

                    return <Ionicons name={iconName as any} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
            <Tab.Screen name="Assessment" component={AssessmentScreen} options={{ tabBarLabel: 'Assess' }} />
            <Tab.Screen name="Mood" component={MoodScreen} options={{ tabBarLabel: 'Mood' }} />
            <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: 'History' }} />
        </Tab.Navigator>
    );
}
