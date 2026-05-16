import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SettingsState {
    themeMode: 'dark' | 'light';
    notificationsEnabled: boolean;
    reminderHour: number;
    reminderMinute: number;
}

const initialState: SettingsState = {
    themeMode: 'dark',
    notificationsEnabled: false,
    reminderHour: 9,
    reminderMinute: 0,
};

export const loadThemeMode = createAsyncThunk(
    'settings/loadThemeMode',
    async (_, { rejectWithValue }) => {
        try {
            const mode = await AsyncStorage.getItem('themeMode');
            if (mode === 'dark' || mode === 'light') {
                return mode;
            }
            return 'dark'; // default
        } catch (error) {
            return rejectWithValue('Failed to load theme mode');
        }
    }
);

export const saveThemeMode = createAsyncThunk(
    'settings/saveThemeMode',
    async (mode: 'dark' | 'light', { rejectWithValue }) => {
        try {
            await AsyncStorage.setItem('themeMode', mode);
            return mode;
        } catch (error) {
            return rejectWithValue('Failed to save theme mode');
        }
    }
);

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setThemeMode: (state, action: PayloadAction<'dark' | 'light'>) => {
            state.themeMode = action.payload;
        },
        toggleTheme: (state) => {
            state.themeMode = state.themeMode === 'dark' ? 'light' : 'dark';
        },
        setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
            state.notificationsEnabled = action.payload;
        },
        setReminderTime: (state, action: PayloadAction<{ hour: number; minute: number }>) => {
            state.reminderHour = action.payload.hour;
            state.reminderMinute = action.payload.minute;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(loadThemeMode.fulfilled, (state, action) => {
            state.themeMode = action.payload;
        });
        builder.addCase(saveThemeMode.fulfilled, (state, action) => {
            state.themeMode = action.payload;
        });
    },
});

export const {
    setThemeMode,
    toggleTheme,
    setNotificationsEnabled,
    setReminderTime,
} = settingsSlice.actions;

export default settingsSlice.reducer;
