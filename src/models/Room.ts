import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type RoomType = 'Single' | 'Double' | 'Deluxe' | 'Suite' | 'Family';
export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export interface IRoom extends Document {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  roomNumber: string;
  type: RoomType;
  status: RoomStatus;
  floor?: string;
  pricePerDay?: number;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
      index: true,
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Single', 'Double', 'Deluxe', 'Suite', 'Family'],
      default: 'Double',
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance'],
      default: 'available',
      required: true,
      index: true,
    },
    floor: {
      type: String,
      trim: true,
    },
    pricePerDay: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique roomNumber per hotel
RoomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

export const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);

export default Room;
