import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet, Button } from 'react-native';
import { RootState } from '../store';
import { RootStackParamList } from '../screens/WelcomeScreen';

// Auth screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main app screens
import AssessmentScreen from '../screens/AssessmentScreen';
import HistoryScreen from '../screens/HistoryScreen';
import MoodScreen from '../screens/MoodScreen';
import ResultsScreen from '../screens/ResultsScreen';

const Stack = createStackNavigator<RootStackParamList>();

// Stub components kept for screens not yet fully built
const DashboardScreen = ({ navigation }: any) => (
  <View style={styles.container}>
    <Text>Dashboard - Includes react-native-chart-kit</Text>
    <Button title="Log Mood" onPress={() => navigation.navigate('Mood')} color="#00897b" />
  </View>
);
const CrisisScreen = () => <View style={styles.container}><Text>24/7 Crisis Hotline: 988</Text></View>;

export default function AppNavigator() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#e0f2f1' },
          headerTintColor: '#004d40',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        ) : (
          // Main Stack
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Assessment" component={AssessmentScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Mood" component={MoodScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
            <Stack.Screen name="Crisis Support" component={CrisisScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
