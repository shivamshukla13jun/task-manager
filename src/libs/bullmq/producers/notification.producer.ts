import { bullMQService } from '../bullmq.service';
import { QUEUE_NAMES, JOB_NAMES, JOB_DELAYS, JOB_PRIORITIES } from '../constants';

export const notificationProducers = {
  /**
   * exmple
   */
  // followupReminder: (
  //   payload: FollowupReminderPayload,
  //   options?: { delay?: number; priority?: number }
  // ) => {
  //   return bullMQService.addJob(
  //     QUEUE_NAMES.NOTIFICATION,
  //     JOB_NAMES.NOTIFICATION.FOLLOWUP_REMINDER,
  //     payload,
  //     {
  //       delay: options?.delay ?? JOB_DELAYS.IMMEDIATE,
  //       priority: options?.priority ?? JOB_PRIORITIES.MEDIUM,
  //     }
  //   );
  // },
};
