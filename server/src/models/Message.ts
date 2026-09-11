import mongoose, { Schema, model, InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    companyId: {
      type: String,
      required: true,
      index: true,
    },
    fromUid: {
      type: String,
      required: true,
    },
    fromName: {
      type: String,
      required: true,
    },
    fromEmail: {
      type: String,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    likedByAdmin: {
      type: Boolean,
      default: false,
    },
    likedAt: {
      type: Date,
    },
    likedByUid: {
      type: String,
    },
    likedByName: {
      type: String,
    },
    branchId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ companyId: 1, createdAt: -1 });
messageSchema.index({ companyId: 1, fromUid: 1 });

export type MessageType = InferSchemaType<typeof messageSchema>;

export const Message =
  (mongoose.models.Message as mongoose.Model<MessageType> | undefined) ||
  model<MessageType>('Message', messageSchema);

export default Message;
