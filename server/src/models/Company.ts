import mongoose, { Schema, model, InferSchemaType } from 'mongoose';

const companySchema = new Schema(
  {
    companyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerUid: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export type CompanyType = InferSchemaType<typeof companySchema>;

export const Company =
  (mongoose.models.Company as mongoose.Model<CompanyType> | undefined) ||
  model<CompanyType>('Company', companySchema);

export default Company;
