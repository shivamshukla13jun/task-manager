import { rabbitMQService } from './rabbitmq.service';
import { QUEUE_NAMES, ROUTING_KEYS } from './constants';
import { handleResetPasswordRabitMQ } from 'microservices/user-service/user.controller';
import sendEmail from 'libs/sendEmail';

const handleDataViaROutingKey = async (data: any, routingKey: string) => {
    try {
        switch (routingKey) {
            case ROUTING_KEYS.AUTH.RESET_PASSWORD:
                await handleResetPasswordRabitMQ(data);
                break;
            case ROUTING_KEYS.Email.SEND:
                await sendEmail(data);
                break;
            case ROUTING_KEYS.Notification.SEND:
                // await NotificationController.handleNotificationSend(data);
                break;
            default:
                console.warn(`Unknown routing key: ${routingKey}`);
                break;
        }
    } catch (error) {
        console.error('Error processing message:', error);
        throw error;
    }
};

// Initialize message consumers
export const initializeConsumers = async () => {
    try {
        // Initialize auth consumer
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.AUTH,
            handleDataViaROutingKey
        );
        // Initialize user  consumer
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.users,
            handleDataViaROutingKey
        );
       
         // Initialize ledger  consumer
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.Email,
            handleDataViaROutingKey
        );
        console.log('✅ Message consumers initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing message consumers:', error);
        throw error;
    }
};