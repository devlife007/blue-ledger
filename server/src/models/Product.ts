import mongoose, { Schema, model, InferSchemaType } from 'mongoose';

const productSchema = new Schema(
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
    category: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    qtyUploaded: {
      type: Number,
      default: 0,
      min: 0,
    },
    qtySold: {
      type: Number,
      default: 0,
      min: 0,
    },
    qtyCurrent: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['available', 'sold'],
      default: 'available',
    },
    imageUrls: {
      type: [String],
      default: [],
    },
    imagePublicIds: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: String,
    },
    branchId: {
      type: String,
      index: true,
    },
    lastSoldAt: {
      type: Date,
    },
    lastSoldByUid: {
      type: String,
    },
    lastSoldByName: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ companyId: 1, category: 1 });
productSchema.index({ companyId: 1, status: 1 });
productSchema.index({ companyId: 1, branchId: 1 });
productSchema.index({ companyId: 1, name: 1 });

export type ProductType = InferSchemaType<typeof productSchema>;

export const Product =
  (mongoose.models.Product as mongoose.Model<ProductType> | undefined) ||
  model<ProductType>('Product', productSchema);

export default Product;
