import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RootState, AppDispatch } from '../store';
import { loadSecureToken } from '../store/authSlice';

// Auth screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main app screens
import TabNavigator from './TabNavigator';
import ResultsScreen from '../screens/ResultsScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  // Auth
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  // Main
  MainTabs: undefined;
  Results: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated && !!token
  );
  console.log('AppNavigator Auth State:', { isAuthenticated, token });

  const loading = useSelector((state: RootState) => state.auth.loading);

  useEffect(() => {
    dispatch(loadSecureToken());
  }, [dispatch]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#00897b" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <>
        {isAuthenticated ? (
          // ── Authenticated stack ──────────────────────────────────────────────
          <Stack.Navigator
            screenOptions={{
              contentStyle: { backgroundColor: '#0f1923' },
              headerStyle: { backgroundColor: '#0f1923' },
              headerTintColor: '#4db6ac',
              headerTitleStyle: { fontWeight: '600' },
            }}
          >
            <Stack.Screen
              name="MainTabs"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Results"
              component={ResultsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        ) : (
          // ── Unauthenticated stack ────────────────────────────────────────────
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Navigator>
        )}
      </>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
  },
});
