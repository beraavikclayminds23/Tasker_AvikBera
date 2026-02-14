import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { TaskRealmContext } from '../services/realm';
import { Task } from '../models/Task';
import { AppStackParamList } from '../types/navigation';
import { useAppSelector } from '../hooks/redux';
import Realm from 'realm';
import firestore from '@react-native-firebase/firestore';

const { useRealm, useObject } = TaskRealmContext;

type TaskDetailScreenRouteProp = RouteProp<AppStackParamList, 'TaskDetail'>;

import { notificationService } from '../services/notifications';

import { useTheme } from '../hooks/theme';

import CustomHeader from '../components/CustomHeader';

const TaskDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<TaskDetailScreenRouteProp>();
    const realm = useRealm();
    const user = useAppSelector(state => state.auth.user);
    const theme = useTheme();

    const taskId = route.params?.taskId;
    const task = taskId ? useObject(Task, new Realm.BSON.ObjectId(taskId)) : null;

    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
        }
    }, [task]);

    useEffect(() => {
        notificationService.requestPermission();
        notificationService.createChannel();
    }, []);

    const handleSetReminder = async () => {
        const date = new Date(Date.now() + 60 * 1000); // 1 minute from now
        await notificationService.scheduleNotification(
            "Task Reminder",
            `Don't forget: ${title}`,
            date
        );
        Alert.alert("Reminder Set", "You will be reminded in 1 minute");
    };

    const handleSave = () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Title is required');
            return;
        }
        if (!user) {
            Alert.alert('Error', 'User not authenticated');
            return;
        }

        try {
            let newTask: Task | null = null;
            realm.write(() => {
                if (task) {
                    task.title = title;
                    task.description = description;
                    task.updatedAt = new Date();
                    task.synced = false;
                    newTask = task;
                } else {
                    // Explicitly cast or handle the return type
                    const createdTask = realm.create<Task>('Task', {
                        _id: new Realm.BSON.ObjectId(),
                        title,
                        description,
                        isCompleted: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        userId: user.uid,
                        synced: false,
                    });
                    newTask = createdTask;
                }
            });

            // Sync to Firestore
            if (newTask) {
                const taskToSync = newTask as Task;
                const id = taskToSync._id.toHexString();
                const docData = {
                    title,
                    description,
                    isCompleted: taskToSync.isCompleted,
                    createdAt: taskToSync.createdAt,
                    updatedAt: new Date(),
                    userId: user.uid,
                };

                firestore().collection('tasks').doc(id).set(docData, { merge: true })
                    .then(() => {
                        realm.write(() => {
                            const t = realm.objectForPrimaryKey<Task>('Task', new Realm.BSON.ObjectId(id));
                            if (t && t.isValid()) {
                                t.synced = true;
                            }
                        });
                    })
                    .catch(console.error);
            }

            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not save task');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background, padding: 0 }]}>
            <CustomHeader
                title={task ? "Edit Task" : "Add Task"}
                showBack
                onBackPress={() => navigation.goBack()}
            />
            <View style={{ padding: 20 }}>
                <Text style={[styles.label, { color: theme.text }]}>Title</Text>
                <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Task Title"
                    placeholderTextColor={theme.secondary}
                />

                <Text style={[styles.label, { color: theme.text }]}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { borderColor: theme.border, color: theme.text }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Task Description"
                    placeholderTextColor={theme.secondary}
                    multiline
                />

                <Button title="Set Reminder (1 min)" onPress={handleSetReminder} color="orange" />
                <View style={{ height: 10 }} />
                <Button title={task ? "Update Task" : "Add Task"} onPress={handleSave} color={theme.primary} />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    label: { fontSize: 16, marginBottom: 5, fontWeight: 'bold' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 20 },
    textArea: { height: 100, textAlignVertical: 'top' },
});

export default TaskDetailScreen;
