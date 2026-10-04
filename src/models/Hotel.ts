import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IHotel extends Document {
  _id: Types.ObjectId;
  name: string;
  city: string;
  address: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HotelSchema = new Schema<IHotel>(
  {
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

// Delete cached model in dev/HMR to guarantee new schema is loaded
if (mongoose.models.Hotel) {
  delete mongoose.models.Hotel;
}

export const Hotel: Model<IHotel> = mongoose.model<IHotel>('Hotel', HotelSchema);

export default Hotel;
