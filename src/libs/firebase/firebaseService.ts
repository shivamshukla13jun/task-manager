import { admin } from './firebase';

export interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: any;
}

interface FirebaseResponse {
  success: number;
  failure: number;
  responses: any[];
}

interface TopicResponse {
  success: boolean;
  messageId: string;
}

class FirebaseService {
  static async sendNotification(
    tokens: string | string[], 
    notification: NotificationPayload, 
    data: Record<string, any> = {}
  ): Promise<FirebaseResponse> {
    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          // ...notification.imageUrl && { imageUrl: notification.imageUrl }
        },
        data: {
          ...data,
          // title: notification.title,
          // body: notification.body,
          // ...notification.imageUrl && { imageUrl: notification.imageUrl }
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        // tokens: Array.isArray(tokens) ? tokens : [tokens]
      };

      const response = await admin.messaging().sendEachForMulticast({
        tokens: Array.isArray(tokens) ? tokens : [tokens],
        ...message
      });

      console.log("response", response);
    
      return {
        success: response.successCount,
        failure: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      console.error('Firebase notification error:', error);
      throw error;
    }
  }

  static async sendToTopic(
    topic: string, 
    notification: NotificationPayload, 
    data: Record<string, any> = {}
  ): Promise<TopicResponse> {
    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl })
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        topic
      };

      const response = await admin.messaging().send(message);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Firebase topic notification error:', error);
      throw error;
    }
  }

  static async subscribeToTopic(tokens: string | string[], topic: string): Promise<any> {
    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      return response;
    } catch (error) {
      console.error('Topic subscription error:', error);
      throw error;
    }
  }

  static async unsubscribeFromTopic(tokens: string | string[], topic: string): Promise<any> {
    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      return response;
    } catch (error) {
      console.error('Topic unsubscription error:', error);
      throw error;
    }
  }
}

export default FirebaseService;
