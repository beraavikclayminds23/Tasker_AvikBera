import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { TaskRealmContext } from '../services/realm';
import { Task } from '../models/Task';
import { AppStackParamList } from '../types/navigation';
import { useAppSelector } from '../hooks/redux';
import Realm from 'realm';
import firestore from '@react-native-firebase/firestore';
import { notificationService } from '../services/notifications';
import { useTheme } from '../hooks/theme';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';

const { useRealm, useObject } = TaskRealmContext;

type TaskDetailScreenRouteProp = RouteProp<AppStackParamList, 'TaskDetail'>;

const BRAND = '#2E5BFF';
const BRAND_DARK = '#1A3FCC';
const AMBER = '#F59E0B';
const AMBER_BG_L = '#FFFBEB';
const AMBER_BG_D = '#2A2010';
const AMBER_BD_L = '#FDE68A';
const AMBER_BD_D = '#3D2E10';

const TaskDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<TaskDetailScreenRouteProp>();
  const realm = useRealm();
  const user = useAppSelector((state) => state.auth.user);
  const theme = useTheme();
  const isDark = theme.background === '#121212';

  const taskId = route.params?.taskId;
  const task = taskId ? useObject(Task, new Realm.BSON.ObjectId(taskId)) : null;
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  // Reminder states
  const [reminderDateTime, setReminderDateTime] = useState<Date | null>(null);
  const [reminderSet, setReminderSet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, []);

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

  const formatDate = (date: Date): string => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatReminder = (date: Date): string => {
    return `${formatDate(date)} • ${formatTime(date)}`;
  };

  // ── Reminder handlers ──────────────────────────────────────────────────────
  const handleOpenReminderPicker = () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a task title first.');
      return;
    }
    setShowDatePicker(true);
  };

  const handleConfirmDate = (selected: Date) => {
    setShowDatePicker(false);
    setReminderDateTime(selected);
    setShowTimePicker(true);
  };

  const handleConfirmTime = (selected: Date) => {
    setShowTimePicker(false);

    if (!reminderDateTime) return;

    const combined = new Date(reminderDateTime);
    combined.setHours(selected.getHours());
    combined.setMinutes(selected.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);

    const now = new Date();
    if (combined <= now) {
      Alert.alert('Invalid Time', 'Reminder must be set in the future.');
      setReminderDateTime(null);
      setReminderSet(false);
      return;
    }

    setReminderDateTime(combined);
    setReminderSet(true);
  };

  const handleCancelPicker = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
    setReminderDateTime(null);
    setReminderSet(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a task title.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();

    setIsSaving(true);

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
          const created = realm.create<Task>('Task', {
            _id: new Realm.BSON.ObjectId(),
            title,
            description,
            isCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: user.uid,
            synced: false,
          });
          newTask = created;
        }
      });

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

        await firestore().collection('tasks').doc(id).set(docData, { merge: true });

        realm.write(() => {
          const t = realm.objectForPrimaryKey<Task>('Task', new Realm.BSON.ObjectId(id));
          if (t && t.isValid()) t.synced = true;
        });

        // Schedule notification if reminder is set
        if (reminderDateTime) {
          try {
            await notificationService.scheduleNotification(
              'Task Reminder',
              `Don't forget: ${title}`,
              reminderDateTime
            );
          } catch (notifError) {
            console.warn('Notification scheduling failed:', notifError);
            // You can show a non-blocking message here if you want
          }
        }
      }

      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not save the task.');
    } finally {
      setIsSaving(false);
    }
  };

  // Derived colours
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBg = isDark ? '#252528' : '#F5F8FF';
  const labelClr = isDark ? '#8A8FA8' : '#64748B';
  const divClr = isDark ? '#252528' : '#EEF2FF';
  const borderClr = isDark ? '#2C2C2C' : '#E2E8F0';
  const iconClr = labelClr;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <View style={[styles.blob, { opacity: isDark ? 0.10 : 0.07 }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: divClr }]}>
            <TouchableOpacity
              style={[
                styles.backBtn,
                {
                  backgroundColor: isDark ? '#252528' : '#F0F3FF',
                  borderColor: isDark ? '#333' : '#E0E7FF',
                },
              ]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
            >
              <View style={[styles.backArrow, { borderColor: isDark ? '#aaa' : BRAND }]} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View
                style={[
                  styles.headerBadge,
                  {
                    backgroundColor: isEdit
                      ? isDark
                        ? '#1A2040'
                        : '#EEF2FF'
                      : isDark
                      ? '#1A2A1A'
                      : '#F0FFF4',
                  },
                ]}
              >
                <Feather
                  name={isEdit ? 'edit-3' : 'plus-circle'}
                  size={13}
                  color={isEdit ? BRAND : '#22C55E'}
                />
                <Text style={[styles.headerBadgeText, { color: isEdit ? BRAND : '#22C55E' }]}>
                  {isEdit ? 'Edit Task' : 'New Task'}
                </Text>
              </View>
            </View>

            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Main Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: cardBg,
                  borderColor: isDark ? '#252528' : '#EEF1FB',
                },
              ]}
            >
              {/* Title */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: labelClr }]}>TITLE</Text>
                <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: borderClr }]}>
                  <View style={styles.iconBox}>
                    <Feather name="type" size={16} color={iconClr} />
                  </View>
                  <TextInput
                    style={[styles.tInput, { color: theme.text }]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="What needs to be done?"
                    placeholderTextColor={isDark ? '#555' : '#A8B4C8'}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Description */}
              <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
                <Text style={[styles.fieldLabel, { color: labelClr }]}>DESCRIPTION</Text>
                <View
                  style={[
                    styles.inputRow,
                    styles.textAreaRow,
                    { backgroundColor: inputBg, borderColor: borderClr },
                  ]}
                >
                  <View style={[styles.iconBox, { alignSelf: 'flex-start', paddingTop: 2 }]}>
                    <Feather name="align-left" size={16} color={iconClr} />
                  </View>
                  <TextInput
                    style={[styles.tInput, styles.textArea, { color: theme.text }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add more details..."
                    placeholderTextColor={isDark ? '#555' : '#A8B4C8'}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>

            {/* Reminder Section */}
            <TouchableOpacity
              style={[
                styles.reminderCard,
                {
                  backgroundColor: reminderSet
                    ? isDark ? AMBER_BG_D : AMBER_BG_L
                    : isDark ? '#1C1C1E' : '#FFFFFF',
                  borderColor: reminderSet
                    ? isDark ? AMBER_BD_D : AMBER_BD_L
                    : isDark ? '#252528' : '#EEF1FB',
                },
              ]}
              onPress={handleOpenReminderPicker}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.reminderIconBox,
                  { backgroundColor: reminderSet ? AMBER : isDark ? '#252528' : '#FFF7E6' },
                ]}
              >
                <Feather name="bell" size={18} color={reminderSet ? '#fff' : AMBER} />
              </View>

              <View style={styles.reminderBody}>
                <Text style={[styles.reminderTitle, { color: theme.text }]}>
                  {reminderSet ? 'Reminder Scheduled' : 'Set Reminder'}
                </Text>
                <Text style={[styles.reminderSub, { color: labelClr }]}>
                  {reminderSet
                    ? `At ${formatReminder(reminderDateTime!)}`
                    : 'Choose date & time'}
                </Text>
              </View>

              <View
                style={[
                  styles.reminderChevron,
                  { backgroundColor: isDark ? '#252528' : '#F0F3FF' },
                ]}
              >
                <Feather
                  name={reminderSet ? 'check' : 'chevron-right'}
                  size={16}
                  color={reminderSet ? '#22C55E' : labelClr}
                />
              </View>
            </TouchableOpacity>

            {/* Date Picker */}
            <DatePicker
              modal
              open={showDatePicker}
              date={reminderDateTime || new Date()}
              mode="date"
              minimumDate={new Date()}
              onConfirm={handleConfirmDate}
              onCancel={handleCancelPicker}
            />

            {/* Time Picker */}
            <DatePicker
              modal
              open={showTimePicker}
              date={reminderDateTime || new Date()}
              mode="time"
              onConfirm={handleConfirmTime}
              onCancel={handleCancelPicker}
            />

            {/* Save Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.saveBtn, { opacity: isSaving ? 0.8 : 1 }]}
                onPress={handleSave}
                activeOpacity={0.88}
                disabled={isSaving}
              >
                <MaterialIcons
                  name={isEdit ? 'save' : 'add-task'}
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.saveBtnText}>{isEdit ? 'Update Task' : 'Add Task'}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Discard */}
            <TouchableOpacity style={styles.discardRow} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={[styles.discardText, { color: labelClr }]}>Discard changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  blob: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: BRAND,
    top: -100,
    right: -90,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 9,
    height: 9,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  headerCenter: { alignItems: 'center' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerBadgeText: { fontSize: 13, fontWeight: '700' },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 14,
  },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    gap: 18,
  },

  fieldGroup: { gap: 8 },

  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 13,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  textAreaRow: {
    alignItems: 'flex-start',
    paddingVertical: 14,
  },

  iconBox: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },

  tInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 0,
  },

  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  reminderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderBody: { flex: 1 },
  reminderTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  reminderSub: { fontSize: 12, fontWeight: '400' },
  reminderChevron: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveBtn: {
    height: 54,
    borderRadius: 15,
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  discardRow: { alignItems: 'center', paddingVertical: 4 },
  discardText: { fontSize: 14, fontWeight: '500' },
});

export default TaskDetailScreen;