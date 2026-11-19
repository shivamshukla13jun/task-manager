// services/NotificationService.ts


import TwilioService from "../TwilioService";
import FirebaseService, {  NotificationPayload } from "../firebase/firebaseService";
import  Notification  from "./notification.model";
class NotificationService {

    // ---------------- SMS ----------------

  async sendSMS(phone: string, message: string) {
    return TwilioService.sendSMS(phone, message)
  }
  

  // ---------------- NOTIFICATION ----------------

async sendNotification(data: {
  fcmToken: string[];
  deviceType?: string;
  notification: NotificationPayload;
  data?: any;
  userIds: string[];
  imageUrl?: string | null;
  scheduledFor?: Date | null;
}): Promise<{ success: boolean,status: string }> {
  const tokens = data.fcmToken || [];

  let status: 'sent' | 'failed' | 'partial' = 'sent';

  try {
    const payloadData = {
      ...(data.data || {}),
      deviceType: data.deviceType || 'unknown',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      timestamp: Date.now()
    };

  
    // ✅ 1. Send push (if tokens exist)
    if (tokens.length > 0) {
      try {
       const  firebaseResponse = await FirebaseService.sendNotification(
          tokens,
          data.notification,
          payloadData
        );

        // 🔍 Decide status
        if (firebaseResponse.failure > 0 && firebaseResponse.success > 0) {
          status = 'partial';
        } else if (firebaseResponse.failure > 0) {
          status = 'failed';
        }

      } catch (err) {
        console.error('Push failed, skipping...', err);
        status = 'failed'; // ❗ don't throw
      }
    } else {
      status = 'failed';
    }

    // ✅ 2. Always save notification in DB
    await Notification.create({
      title: data.notification.title,
      body: data.notification.body,
      imageUrl: data.imageUrl || null,
      type: data.deviceType || 'all',
      userIds: data.userIds || [],
      status,
      scheduledFor: data.scheduledFor || null,
      data: payloadData
    });

    return {
      success: status !== 'failed',
      status
    };

  } catch (error) {
    // ❗ Only DB failure comes here
    console.error('Notification DB error:', error);

    return {
      success: false,
      status: 'failed'
    };
  }
}
}

export default new NotificationService();
