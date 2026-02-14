export type AuthStackParamList = {
    Login: undefined;
    SignUp: undefined;
};

export type AppStackParamList = {
    TaskList: undefined;
    TaskDetail: { taskId?: string };
};
