import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    RefreshControl, Modal, Pressable, StatusBar, Animated,
} from 'react-native';
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
import { useTheme } from '../hooks/theme';

const { useQuery, useRealm } = TaskRealmContext;

type TaskListScreenNavigationProp = StackNavigationProp<AppStackParamList, 'TaskList'>;

const BRAND = '#2E5BFF';

// ── FAB ──────────────────────────────────────────────────────────────────────
const FAB = ({ onPress }: { onPress: () => void }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
        ]).start();
        onPress();
    };

    return (
        <Animated.View style={[styles.fab, { transform: [{ scale }] }]}>
            <TouchableOpacity onPress={handlePress} style={styles.fabInner} activeOpacity={0.88}>
                <Feather name="plus" size={26} color="#fff" />
            </TouchableOpacity>
        </Animated.View>
    );
};

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ isDark, labelColor }: { isDark: boolean; labelColor: string }) => (
    <View style={styles.emptyWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#1C1C1E' : '#EEF2FF', borderColor: isDark ? '#2C2C2C' : '#D6E0FF' }]}>
            <Feather name="check-square" size={36} color={BRAND} />
        </View>
        <Text style={[styles.emptyTitle, { color: labelColor }]}>No tasks yet</Text>
        <Text style={[styles.emptyNote,  { color: labelColor }]}>Tap + to add your first task</Text>
    </View>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const TaskListScreen = () => {
    const navigation = useNavigation<TaskListScreenNavigationProp>();
    const dispatch   = useAppDispatch();
    const realm      = useRealm();
    const user       = useAppSelector(state => state.auth.user);
    const theme      = useTheme();
    const { themeMode } = useAppSelector(state => state.theme);
    const isDark     = theme.background === '#121212';

    const [modalVisible, setModalVisible] = useState(false);
    const [refreshing,   setRefreshing]   = useState(false);

    // Single entrance fade — minimal animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    const tasks = useQuery(Task).filtered('userId == $0', user?.uid).sorted('createdAt', true);

    const completedCount = tasks.filter(t => t.isCompleted).length;
    const totalCount     = tasks.length;
    const progress       = totalCount > 0 ? completedCount / totalCount : 0;

    const handleLogout = async () => {
        try {
            setModalVisible(false);
            await auth().signOut();
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    const handleThemeChange = (mode: ThemeMode) => dispatch(setThemeMode(mode));

    const syncTasks = useCallback(async () => {
        if (!user) return;
        const isConnected = (await NetInfo.fetch()).isConnected;
        if (!isConnected) return;
        setRefreshing(true);
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
        } finally {
            setRefreshing(false);
        }
    }, [user, realm]);

    useEffect(() => { syncTasks(); }, [syncTasks]);

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
        realm.write(() => { realm.delete(task); });
        if (user) {
            firestore().collection('tasks').doc(id).delete();
        }
    };

    // Derived colours
    const cardBg    = isDark ? '#1C1C1E' : '#FFFFFF';
    const labelClr  = isDark ? '#8A8FA8' : '#64748B';
    const divClr    = isDark ? '#252528' : '#EEF2FF';
    const trackClr  = isDark ? '#252528' : '#E8EAF6';

    // ── Task row ──
    const renderItem = ({ item }: { item: Task }) => (
        <View style={[
            styles.taskCard,
            {
                backgroundColor: cardBg,
                borderColor: isDark ? '#252528' : '#EEF1FB',
                shadowColor: BRAND,
            },
            item.isCompleted && { opacity: 0.65 },
        ]}>
            {/* Coloured left accent */}
            <View style={[
                styles.taskAccent,
                { backgroundColor: item.isCompleted ? (isDark ? '#333' : '#CBD5E1') : BRAND },
            ]} />

            <TouchableOpacity onPress={() => toggleComplete(item)} style={styles.checkBtn} activeOpacity={0.7}>
                <View style={[
                    styles.checkCircle,
                    {
                        borderColor: item.isCompleted ? '#52C41A' : (isDark ? '#3A3A3A' : '#CBD5E1'),
                        backgroundColor: item.isCompleted ? '#52C41A' : 'transparent',
                    },
                ]}>
                    {item.isCompleted && <Feather name="check" size={12} color="#fff" />}
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.taskBody}
                onPress={() => navigation.navigate('TaskDetail', { taskId: item._id.toHexString() })}
                activeOpacity={0.7}
            >
                <Text
                    style={[
                        styles.taskTitle,
                        { color: theme.text },
                        item.isCompleted && { textDecorationLine: 'line-through', color: labelClr },
                    ]}
                    numberOfLines={1}
                >
                    {item.title}
                </Text>
                {!!item.description && (
                    <Text style={[styles.taskDesc, { color: labelClr }]} numberOfLines={1}>
                        {item.description}
                    </Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => deleteTask(item)} style={styles.deleteBtn} activeOpacity={0.7}>
                <View style={[styles.deleteCircle, { backgroundColor: isDark ? '#2A1A1A' : '#FFF0F0' }]}>
                    <MaterialIcons name="delete-outline" size={18} color={theme.danger} />
                </View>
            </TouchableOpacity>
        </View>
    );

    // ── Theme option row inside modal ──
    const ThemeOption = ({ mode, label, icon }: { mode: ThemeMode; label: string; icon: string }) => (
        <TouchableOpacity
            style={[
                styles.modalOption,
                { borderColor: isDark ? '#252528' : '#EEF1FB' },
                themeMode === mode && { backgroundColor: isDark ? '#1A2040' : '#EEF2FF', borderColor: BRAND },
            ]}
            onPress={() => handleThemeChange(mode)}
            activeOpacity={0.75}
        >
            <View style={[
                styles.optionIconBox,
                { backgroundColor: themeMode === mode ? BRAND : (isDark ? '#252528' : '#F0F3FF') },
            ]}>
                <Feather name={icon} size={16} color={themeMode === mode ? '#fff' : labelClr} />
            </View>
            <Text style={[
                styles.modalOptionText,
                { color: theme.text },
                themeMode === mode && { color: BRAND, fontWeight: '700' },
            ]}>
                {label}
            </Text>
            {themeMode === mode && <Feather name="check" size={16} color={BRAND} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>

                {/* ── Header ── */}
                <View style={[styles.header, { borderBottomColor: divClr }]}>
                    <View>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>My Tasks</Text>
                        <Text style={[styles.headerSub, { color: labelClr }]}>
                            {completedCount} of {totalCount} completed
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setModalVisible(true)}
                        style={[styles.menuBtn, { backgroundColor: isDark ? '#1C1C1E' : '#F0F3FF', borderColor: isDark ? '#2C2C2C' : '#D6E0FF' }]}
                        activeOpacity={0.75}
                    >
                        <Entypo name="dots-three-vertical" size={16} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* ── Progress bar ── */}
                {totalCount > 0 && (
                    <View style={[styles.progressWrap, { paddingHorizontal: 20, marginBottom: 8 }]}>
                        <View style={[styles.progressTrack, { backgroundColor: trackClr }]}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
                        </View>
                        <Text style={[styles.progressLabel, { color: labelClr }]}>
                            {Math.round(progress * 100)}%
                        </Text>
                    </View>
                )}

                {/* ── List ── */}
                <FlatList
                    data={tasks}
                    keyExtractor={item => item._id.toHexString()}
                    renderItem={renderItem}
                    contentContainerStyle={[
                        styles.listContent,
                        tasks.length === 0 && { flex: 1 },
                    ]}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                    ListEmptyComponent={<EmptyState isDark={isDark} labelColor={labelClr} />}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={syncTasks}
                            colors={[BRAND]}
                            tintColor={BRAND}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </Animated.View>

            {/* ── FAB ── */}
            <FAB onPress={() => navigation.navigate('TaskDetail', {})} />

            {/* ── Settings Modal ── */}
            <Modal
                animationType="fade"
                transparent
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <StatusBar
                    barStyle={isDark ? 'light-content' : 'dark-content'}
                    backgroundColor={isDark ? theme.background : "#00000080"}
                />
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <Pressable>
                        <View style={[
                            styles.modalSheet,
                            {
                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                borderColor: isDark ? '#252528' : '#EEF1FB',
                            },
                        ]}>
                            {/* Handle */}
                            <View style={styles.sheetHandle}>
                                <View style={[styles.handleBar, { backgroundColor: isDark ? '#444' : '#D1D5DB' }]} />
                            </View>

                            <Text style={[styles.modalTitle, { color: theme.text }]}>Settings</Text>

                            {/* Theme section */}
                            <Text style={[styles.sectionLabel, { color: labelClr }]}>APPEARANCE</Text>
                            <ThemeOption mode="light"  label="Light"  icon="sun"      />
                            <ThemeOption mode="dark"   label="Dark"   icon="moon"     />
                            <ThemeOption mode="system" label="System" icon="settings" />

                            {/* Divider */}
                            <View style={[styles.sheetDivider, { backgroundColor: divClr }]} />

                            {/* Logout */}
                            <TouchableOpacity
                                style={[styles.logoutBtn, { backgroundColor: isDark ? '#2A1A1A' : '#FFF5F5', borderColor: isDark ? '#3D1A1A' : '#FECDD3' }]}
                                onPress={handleLogout}
                                activeOpacity={0.8}
                            >
                                <MaterialIcons name="logout" size={20} color={theme.danger} />
                                <Text style={[styles.logoutText, { color: theme.danger }]}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    root: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    headerSub: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
    menuBtn: {
        width: 38, height: 38, borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },

    // Progress
    progressWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 14,
        gap: 10,
    },
    progressTrack: {
        flex: 1, height: 6, borderRadius: 3, overflow: 'hidden',
    },
    progressFill: {
        height: '100%', borderRadius: 3,
        backgroundColor: BRAND,
    },
    progressLabel: {
        fontSize: 12, fontWeight: '700', minWidth: 34, textAlign: 'right',
    },

    // List
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 100,
    },

    // Task card
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 14,
        paddingRight: 14,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    taskAccent: {
        width: 4,
        alignSelf: 'stretch',
        marginRight: 12,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    checkBtn: { padding: 4, marginRight: 10 },
    checkCircle: {
        width: 24, height: 24, borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    taskBody: { flex: 1, marginRight: 8 },
    taskTitle: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
    taskDesc:  { fontSize: 13, fontWeight: '400' },
    deleteBtn: { padding: 2 },
    deleteCircle: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },

    // Empty state
    emptyWrap: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingBottom: 80,
    },
    emptyIcon: {
        width: 80, height: 80, borderRadius: 24,
        borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
    emptyNote:  { fontSize: 14, fontWeight: '400' },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 30, right: 24,
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.50,
        shadowRadius: 16,
        elevation: 12,
    },
    fabInner: {
        width: 58, height: 58, borderRadius: 18,
        backgroundColor: BRAND,
        alignItems: 'center', justifyContent: 'center',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: '#00000080',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 40,
        borderWidth: 1,
    },
    sheetHandle: {
        alignItems: 'center', paddingTop: 12, paddingBottom: 8,
    },
    handleBar: {
        width: 40, height: 4, borderRadius: 2,
    },
    modalTitle: {
        fontSize: 20, fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 10, fontWeight: '700',
        letterSpacing: 1.4,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 13,
        borderWidth: 1.5,
        marginVertical: 4,
    },
    optionIconBox: {
        width: 32, height: 32, borderRadius: 9,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    modalOptionText: { flex: 1, fontSize: 15, fontWeight: '500' },

    sheetDivider: { height: 1, marginVertical: 16 },

    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52, borderRadius: 14,
        borderWidth: 1.5,
        gap: 10,
    },
    logoutText: { fontSize: 15, fontWeight: '700' },
});

export default TaskListScreen;