import Realm from 'realm';

export class Task extends Realm.Object<Task> {
    _id!: Realm.BSON.ObjectId;
    title!: string;
    description?: string;
    isCompleted!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
    synced!: boolean;
    userId!: string; // To link task to specific user

    static schema: Realm.ObjectSchema = {
        name: 'Task',
        primaryKey: '_id',
        properties: {
            _id: 'objectId',
            title: 'string',
            description: 'string?',
            isCompleted: { type: 'bool', default: false },
            createdAt: 'date',
            updatedAt: 'date',
            synced: { type: 'bool', default: false },
            userId: 'string',
        },
    };
}
