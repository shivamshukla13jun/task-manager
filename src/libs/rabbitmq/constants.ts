export const QUEUE_NAMES = {
    AUTH: 'auth',
    users: 'users',
    Email: 'email',
    Notification: 'notification',
};

export const EXCHANGE_NAMES = {
    AUTH: 'auth-exchange',
    users: 'users-exchange',
    Email: 'email-exchange',
    Notification: 'notification-exchange',
};

export const ROUTING_KEYS = {
    Email: {
        SEND: 'email.send'
    },
    Notification: {
        SEND: 'notification.send'
    },
    AUTH: {
        RESET_PASSWORD: 'auth.reset-password',
    },
    users: {
        CREATE: 'users.create',
        UPDATE: 'users.update',
        DELETE: 'users.delete',
    },
};