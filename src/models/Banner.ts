import mongoose, { Document, Schema } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  description: string;
  image: string;
  mobileImage: string;
  status: string;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    image: { type: String, required: true },
    mobileImage: { type: String },
    status: { type: String, default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Banner = mongoose.model<IBanner>('Banner', bannerSchema);
