import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button, RefreshControl, Modal, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TaskRealmContext } from '../services/realm';
import { Task } from '../models/Task';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../types/navigation';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import NetInfo from "@react-native-community/netinfo";
import Feather from "react-native-vector-icons/Feather";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Entypo from "react-native-vector-icons/Entypo";
import { setThemeMode, ThemeMode } from '../store/slices/themeSlice';
import CustomHeader from '../components/CustomHeader';


const { useQuery, useRealm } = TaskRealmContext;

type TaskListScreenNavigationProp = StackNavigationProp<AppStackParamList, 'TaskList'>;

import { useTheme } from '../hooks/theme';

const TaskListScreen = () => {
    const navigation = useNavigation<TaskListScreenNavigationProp>();
    const dispatch = useAppDispatch();
    const realm = useRealm();
    const user = useAppSelector(state => state.auth.user);
    const theme = useTheme();
    const { themeMode } = useAppSelector(state => state.theme);
    const [modalVisible, setModalVisible] = useState(false);

    const tasks = useQuery(Task).filtered('userId == $0', user?.uid).sorted('createdAt', true);

    const handleLogout = async () => {
        try {
            setModalVisible(false);
            await auth().signOut();
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    const handleThemeChange = (mode: ThemeMode) => {
        dispatch(setThemeMode(mode));
    };

    const syncTasks = useCallback(async () => {
        if (!user) return;
        const isConnected = (await NetInfo.fetch()).isConnected;
        if (!isConnected) return;


        try {
            const snapshot = await firestore().collection('tasks').where('userId', '==', user.uid).get();
            realm.write(() => {
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    realm.create('Task', {
                        _id: new Realm.BSON.ObjectId(doc.id),
                        title: data.title,
                        description: data.description,
                        isCompleted: data.isCompleted,
                        createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date(),
                        updatedAt: new Date(),
                        userId: user.uid,
                        synced: true,
                    }, Realm.UpdateMode.Modified);
                });
            });
        } catch (e) {
            console.error("Sync error", e);
        }
    }, [user, realm]);

    useEffect(() => {
        syncTasks();
    }, [syncTasks]);


    const toggleComplete = (task: Task) => {
        realm.write(() => {
            task.isCompleted = !task.isCompleted;
            task.synced = false;
        });


        if (user) {
            firestore().collection('tasks').doc(task._id.toHexString()).update({
                isCompleted: task.isCompleted,
                updatedAt: firestore.FieldValue.serverTimestamp(),
            }).then(() => {
                realm.write(() => { task.synced = true; });
            }).catch(console.error);
        }
    };

    const deleteTask = (task: Task) => {
        const id = task._id.toHexString();
        realm.write(() => {
            realm.delete(task);
        });
        if (user) {
            firestore().collection('tasks').doc(id).delete();
        }
    };

    const renderItem = ({ item }: { item: Task }) => (
        <View style={[styles.itemContainer, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => toggleComplete(item)} style={styles.check}>
                {item.isCompleted ?
                    <Feather name={'check-circle'} size={25} color={theme.task} />
                    :
                    <Feather name={'loader'} size={25} color={theme.taskload} />}
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.content}
                onPress={() => navigation.navigate('TaskDetail', { taskId: item._id.toHexString() })}
            >
                <Text style={[styles.title, { color: theme.text }, item.isCompleted && styles.completed]}>{item.title}</Text>
                <Text style={{ color: theme.secondary }} numberOfLines={1}>{item.description}</Text>

            </TouchableOpacity>
            {/* <Button title="Del" onPress={() => deleteTask(item)} color={theme.danger} /> */}
            <TouchableOpacity onPress={() => deleteTask(item)} >
                <MaterialIcons name={'delete'} size={25} color={theme.danger} />
            </TouchableOpacity>
        </View>
    );

    const ThemeOption = ({ mode, label, icon }: { mode: ThemeMode, label: string, icon: string }) => (
        <TouchableOpacity
            style={[styles.modalOption, themeMode === mode && { backgroundColor: theme.primary + '20' }]}
            onPress={() => handleThemeChange(mode)}
        >
            <Feather name={icon} size={20} color={themeMode === mode ? theme.primary : theme.text} />
            <Text style={[styles.modalOptionText, { color: theme.text }, themeMode === mode && { color: theme.primary, fontWeight: 'bold' }]}>
                {label}
            </Text>
            {themeMode === mode && <Feather name="check" size={20} color={theme.primary} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background, padding: 0 }]}>
            <CustomHeader
                title="Tasks"
                rightElement={
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Entypo name="dots-three-vertical" size={20} color={theme.text} />
                    </TouchableOpacity>
                }
            />
            <View style={{ flex: 1, padding: 10 }}>
                <Button title="Add New Task" onPress={() => navigation.navigate('TaskDetail', {})} color={theme.primary} />
                <FlatList
                    data={tasks}
                    keyExtractor={(item) => item._id.toHexString()}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={false} onRefresh={syncTasks} colors={[theme.primary]} tintColor={theme.primary} />}
                    contentContainerStyle={{ flexGrow: 1 }}
                />
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <StatusBar barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'}
                 backgroundColor={theme.background === '#ffffff' ? "#00000080" : theme.background } />
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Settings</Text>
                        </View>

                        <View style={styles.modalSection}>
                            <Text style={[styles.sectionTitle, { color: theme.secondary }]}>Theme Mode</Text>
                            <ThemeOption mode="light" label="Light" icon="sun" />
                            <ThemeOption mode="dark" label="Dark" icon="moon" />
                            <ThemeOption mode="system" label="System" icon="settings" />
                        </View>

                        <TouchableOpacity style={[styles.logoutButton, { borderTopColor: theme.border }]} onPress={handleLogout}>
                            <MaterialIcons name="logout" size={22} color={theme.danger} />
                            <Text style={[styles.logoutText, { color: theme.danger }]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10 },
    itemContainer: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, alignItems: 'center' },
    check: { padding: 10 },
    content: { flex: 1, marginHorizontal: 10 },
    title: { fontSize: 16, fontWeight: 'bold' },
    completed: { textDecorationLine: 'line-through', color: 'gray' },
    modalOverlay: {
        flex: 1,
        backgroundColor: '#00000080' ,// 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    modalHeader: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalSection: {
        paddingVertical: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginVertical: 2,
    },
    modalOptionText: {
        flex: 1,
        fontSize: 16,
        marginLeft: 15,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        borderTopWidth: 1,
        marginTop: 10,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 15,
    },
});

export default TaskListScreen;
