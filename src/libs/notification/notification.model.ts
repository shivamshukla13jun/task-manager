import mongoose, { Schema, Model, Types } from 'mongoose';
import { Document } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  title: string;
  body: string;
  imageUrl?: Types.ObjectId;
  type: 'android' | 'ios' | 'all';
  userIds: Types.ObjectId[];
  data?: Record<string, any>;
  status: 'sent' | 'partial' | 'failed';
  createdAt?: Date;
  updatedAt?: Date;
}
// Extended Notification interface for this model
interface INotificationExtended extends INotification {
  scheduledFor?: Date | null;
}

const NotificationSchema = new Schema<INotificationExtended>({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  imageUrl: {
    type:  Schema.Types.ObjectId,
    default: null,
    ref: 'File'
  },
  type: {
    type: String,
    enum: ['all', 'android', 'ios'],
    default: 'all',
    required: true
  },
  userIds: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'partial'],
    default: 'sent',
    required: true
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Optional: indexes for querying efficiency
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ scheduledFor: 1 });

const Notification: Model<INotificationExtended> = mongoose.model<INotificationExtended>('Notification', NotificationSchema);

export { Notification, NotificationSchema };
export default Notification;
