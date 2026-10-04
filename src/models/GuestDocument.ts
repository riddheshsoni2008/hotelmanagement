import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type DocumentKind = 'aadhaar_front' | 'aadhaar_back' | 'guest_photo';

export const MAX_DOCUMENT_SIZE_BYTES = 40960; // 40 KB strict limit

export interface IGuestDocument extends Document {
  _id: Types.ObjectId;
  guestId: Types.ObjectId;
  hotelId: Types.ObjectId;
  kind: DocumentKind;
  contentType: string;
  data: Buffer;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const GuestDocumentSchema = new Schema<IGuestDocument>(
  {
    guestId: {
      type: Schema.Types.ObjectId,
      ref: 'Guest',
      required: [true, 'Guest ID is required'],
      index: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
      index: true,
    },
    kind: {
      type: String,
      enum: ['aadhaar_front', 'aadhaar_back', 'guest_photo'],
      required: [true, 'Document kind is required'],
    },
    contentType: {
      type: String,
      required: [true, 'Content type is required'],
      enum: {
        values: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        message: 'Only JPEG, PNG, and WebP images are allowed',
      },
    },
    data: {
      type: Buffer,
      required: [true, 'Image data Buffer is required'],
    },
    sizeBytes: {
      type: Number,
      required: [true, 'Size in bytes is required'],
      validate: {
        validator: function (v: number) {
          return v > 0 && v <= MAX_DOCUMENT_SIZE_BYTES;
        },
        message: `Image file size must be less than or equal to ${MAX_DOCUMENT_SIZE_BYTES} bytes (40 KB).`,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying documents by guest
GuestDocumentSchema.index({ guestId: 1, kind: 1 });
GuestDocumentSchema.index({ hotelId: 1, createdAt: 1 });

export const GuestDocument: Model<IGuestDocument> =
  mongoose.models.GuestDocument ||
  mongoose.model<IGuestDocument>('GuestDocument', GuestDocumentSchema);

export default GuestDocument;
