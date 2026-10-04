import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type DurationUnit = 'hours' | 'days';
export type StayStatus = 'checked_in' | 'checked_out';
export type PaymentMode = 'cash' | 'upi' | 'card';

export interface IStay extends Document {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  guestId: Types.ObjectId;
  roomId: Types.ObjectId;
  checkInAt: Date;
  durationValue: number;
  durationUnit: DurationUnit;
  expectedCheckOutAt: Date;
  actualCheckOutAt?: Date;
  status: StayStatus;
  amount?: number;
  paymentMode?: PaymentMode;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StaySchema = new Schema<IStay>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
      index: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: 'Guest',
      required: [true, 'Guest ID is required'],
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required'],
      index: true,
    },
    checkInAt: {
      type: Date,
      required: [true, 'Check-in time is required'],
      default: Date.now,
    },
    durationValue: {
      type: Number,
      required: [true, 'Duration value is required'],
      min: [1, 'Duration value must be at least 1'],
    },
    durationUnit: {
      type: String,
      enum: ['hours', 'days'],
      required: [true, 'Duration unit is required'],
      default: 'hours',
    },
    expectedCheckOutAt: {
      type: Date,
      required: [true, 'Expected check-out time is required'],
    },
    actualCheckOutAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['checked_in', 'checked_out'],
      default: 'checked_in',
      required: true,
    },
    amount: {
      type: Number,
      min: 0,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'card'],
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

// Required indexes:
// (hotelId, status, expectedCheckOutAt) and (hotelId, checkInAt)
StaySchema.index({ hotelId: 1, status: 1, expectedCheckOutAt: 1 });
StaySchema.index({ hotelId: 1, checkInAt: -1 });
StaySchema.index({ guestId: 1, checkInAt: -1 });

export const Stay: Model<IStay> =
  mongoose.models.Stay || mongoose.model<IStay>('Stay', StaySchema);

export default Stay;
