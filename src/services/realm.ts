import { createRealmContext } from '@realm/react';
import { Task } from '../models/Task';

export const TaskRealmContext = createRealmContext({
    schema: [Task],
    schemaVersion: 1,
});
