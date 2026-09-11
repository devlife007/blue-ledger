import mongoose, { Schema, model, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'worker'],
      default: 'worker',
    },
    companyId: {
      type: String,
      index: true,
    },
    createdBy: {
      type: String,
    },
    branchId: {
      type: String,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ companyId: 1, branchId: 1 });

export type UserType = InferSchemaType<typeof userSchema>;

export const User =
  (mongoose.models.User as mongoose.Model<UserType> | undefined) ||
  model<UserType>('User', userSchema);

export default User;
