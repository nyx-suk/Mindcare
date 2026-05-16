import React, { createContext, ReactNode } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppTheme, DARK_THEME, LIGHT_THEME } from '../theme/colors';

// Temporary mock action until Redux settings slice is implemented
const setThemeMode = (payload: 'dark' | 'light') => ({
    type: 'settings/setThemeMode',
    payload
});

export interface ThemeContextValue {
    theme: AppTheme;
    themeMode: 'dark' | 'light';
    toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
    theme: DARK_THEME,
    themeMode: 'dark',
    toggleTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const dispatch = useDispatch();

    // Read themeMode from Redux. 
    // Using `state: any` temporarily so TS doesn't complain before settingsSlice is added to RootState
    const themeMode = useSelector((state: any) =>
        state.settings?.themeMode || 'dark'
    ) as 'dark' | 'light';

    const theme = themeMode === 'dark' ? DARK_THEME : LIGHT_THEME;

    const toggleTheme = () => {
        dispatch(setThemeMode(themeMode === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ theme, themeMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
