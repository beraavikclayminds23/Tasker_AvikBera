import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../types/navigation';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

import { useTheme } from '../hooks/theme';
import CustomHeader from '../components/CustomHeader';

const LoginScreen = () => {
    const navigation = useNavigation<LoginScreenNavigationProp>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const theme = useTheme();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            await auth().signInWithEmailAndPassword(email, password);
        } catch (error: any) {
            console.error(error);
            let errorMessage = 'Something went wrong';
            if (error.code === 'auth/invalid-email') errorMessage = 'That email address is invalid!';
            if (error.code === 'auth/user-not-found') errorMessage = 'User not found';
            if (error.code === 'auth/wrong-password') errorMessage = 'Wrong password';
            Alert.alert('Login Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background, padding: 0 }]}>
            <CustomHeader title="Login" />
            <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
                <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    placeholder="Email"
                    placeholderTextColor={theme.secondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    placeholder="Password"
                    placeholderTextColor={theme.secondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} />
                ) : (
                    <Button title="Login" onPress={handleLogin} color={theme.primary} />
                )}
                <View style={styles.spacer} />
                <Button
                    title="Don't have an account? Sign Up"
                    onPress={() => navigation.navigate('SignUp')}
                    color="#888"
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
    spacer: {
        height: 20,
    },
});

export default LoginScreen;
