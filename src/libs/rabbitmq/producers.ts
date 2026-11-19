import { rabbitMQService } from './rabbitmq.service';
import { EXCHANGE_NAMES, ROUTING_KEYS } from './constants';
import { Types } from 'mongoose';
import { AppError } from 'middlewares/error';

/**
 * ✅ Producer Service
 * Handles publishing messages to RabbitMQ for background tasks
 * such as invoice and bill PDF generation.
 */
export class Producer {

  /**
   * 🔹 Trigger Reset password
   * @param id - The unique ID of the user
   * @returns A user-friendly message
   */
  public static async resetPassword(id: string): Promise<string> {
    try {
      const message = { id };

      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AUTH,
        ROUTING_KEYS.AUTH.RESET_PASSWORD,
        message
      );

      if (published) {
        return 'Your password reset request has been processed. You will receive it shortly.';
      } else {
        return 'We encountered an issue while processing your reset password request. Please try again.';
      }
    } catch (error) {
      return 'An unexpected error occurred while resetting your password.';
    }
  }
  /**
   * 🔹 Trigger Create User
   * @param id - The unique ID of the user
   * @returns A user-friendly message
   */
  public static async createUser(data: { id: string; password: string }): Promise<string> {
    try {
      const message = { id:data.id,password:data.password };

      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.users,
        ROUTING_KEYS.users.CREATE,
        message
      );

      if (published) {
        console.log(`✅ Create user message queued for userId: ${data.id}`);
        return 'User created successfully.';
      } else {
        console.warn(`⚠️ Failed to queue create user message for userId: ${data.id}`);
        return 'We encountered an issue while processing your create user request. Please try again.';
      }
    } catch (error) {
      console.error('❌ Error while create user:', error);
      return 'An unexpected error occurred while creating user.';
    }
  }
  /**
   * 🔹 Trigger Create User
   * @param id - The unique ID of the user
   * @returns A user-friendly message
   */
  public static async SendEmail({to,subject,html,attachments=[],cc,bcc}:{to: string, subject: string, html: string, attachments?: Array<{filename: string,content:Buffer}>, cc?: string[], bcc?: string[]}): Promise<string> {
    try {
      const message = { to, subject, html, attachments, cc, bcc };

      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.Email,
        ROUTING_KEYS.Email.SEND,
        message
      );

      if (published) {
        return 'Email Send successfully.';
      } else {
        console.warn(`⚠️ Failed to queue Email Send message`);
        return 'We encountered an issue while processing your Email Send request. Please try again.';
      }
    } catch (error) {
      console.error('❌ Error while create user:', error);
      return 'An unexpected error occurred while creating user.';
    }
  } 
}
