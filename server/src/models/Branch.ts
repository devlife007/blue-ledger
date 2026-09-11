import mongoose, { Schema, model, InferSchemaType } from 'mongoose';

const branchSchema = new Schema(
  {
    companyId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

branchSchema.index({ companyId: 1, isActive: 1 });

export type BranchType = InferSchemaType<typeof branchSchema>;

export const Branch =
  (mongoose.models.Branch as mongoose.Model<BranchType> | undefined) ||
  model<BranchType>('Branch', branchSchema);

export default Branch;
