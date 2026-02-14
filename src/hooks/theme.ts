import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../constants/theme';
import { useAppSelector } from './redux';

export const useTheme = () => {
    const systemScheme = useColorScheme();
    const { themeMode } = useAppSelector((state) => state.theme);

    const activeTheme = themeMode === 'system' ? systemScheme : themeMode;
    return activeTheme === 'dark' ? darkTheme : lightTheme;
};
