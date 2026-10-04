import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IGuest extends Document {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  idType: string;
  idLast4?: string;
  numberOfGuests: number;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GuestSchema = new Schema<IGuest>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    idType: {
      type: String,
      default: 'Aadhaar',
      trim: true,
    },
    idLast4: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^\d{4}$/.test(v);
        },
        message: 'idLast4 must be exactly 4 digits or empty',
      },
    },
    numberOfGuests: {
      type: Number,
      default: 1,
      min: [1, 'Number of guests must be at least 1'],
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful compound index for fast phone search within hotel
GuestSchema.index({ hotelId: 1, phone: 1 });
GuestSchema.index({ phone: 1 });

export const Guest: Model<IGuest> =
  mongoose.models.Guest || mongoose.model<IGuest>('Guest', GuestSchema);

export default Guest;
