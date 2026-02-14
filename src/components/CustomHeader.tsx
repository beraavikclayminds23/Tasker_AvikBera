import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../hooks/theme';

interface CustomHeaderProps {
    title: string;
    showBack?: boolean;
    onBackPress?: () => void;
    rightElement?: React.ReactNode;
}

const CustomHeader = ({ title, showBack, onBackPress, rightElement }: CustomHeaderProps) => {
    const theme = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <StatusBar barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} backgroundColor={theme.background} />
            <View style={styles.content}>
                <View style={styles.leftContainer}>
                    {showBack && (
                        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                            <Feather name="arrow-left" size={24} color={theme.text} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.titleContainer}>
                    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                </View>

                <View style={styles.rightContainer}>
                    {rightElement}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderBottomWidth: 1,
    },
    content: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    leftContainer: {
        width: 40,
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightContainer: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 4,
    },
});

export default CustomHeader;
