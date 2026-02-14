import notifee, { TimestampTrigger, TriggerType, AndroidImportance } from '@notifee/react-native';

class NotificationService {
    async requestPermission() {
        await notifee.requestPermission();
    }

    async createChannel() {
        await notifee.createChannel({
            id: 'default',
            name: 'Default Channel',
            importance: AndroidImportance.HIGH,
        });
    }

    async scheduleNotification(title: string, body: string, date: Date) {
        const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
        };

        await notifee.createTriggerNotification(
            {
                title,
                body,
                android: {
                    channelId: 'default',
                },
            },
            trigger,
        );
    }
}

export const notificationService = new NotificationService();
