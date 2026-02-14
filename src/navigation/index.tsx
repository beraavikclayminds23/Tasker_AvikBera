import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setUser } from '../store/slices/authSlice';
import { ActivityIndicator, View } from 'react-native';

const AppNavigator = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [initializing, setInitializing] = useState(true);

const onAuthStateChanged = useCallback(
    (user: FirebaseAuthTypes.User | null) => {
        dispatch(setUser(user));
        setInitializing(false);
    },
    [dispatch]
);



    useEffect(() => {
        const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
        return subscriber; // unsubscribe on unmount
    }, [onAuthStateChanged]);

    if (initializing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return (
        <NavigationContainer>
            {user ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
};

export default AppNavigator;
