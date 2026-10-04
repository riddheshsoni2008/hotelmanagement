import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const documentUploadItemSchema = z.object({
  kind: z.enum(['aadhaar_front', 'aadhaar_back', 'guest_photo']),
  contentType: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  dataBase64: z.string().min(1, 'Base64 image data is required'),
  sizeBytes: z
    .number()
    .max(40960, 'Image exceeds maximum permitted size of 40KB (40,960 bytes)'),
});

export const checkInSchema = z.object({
  hotelId: z.string().min(1, 'Please select a hotel'),
  roomId: z.string().min(1, 'Please select a room'),
  checkInAt: z.string().optional(),
  durationValue: z.coerce.number().min(1, 'Duration must be at least 1'),
  durationUnit: z.enum(['hours', 'days']),
  amount: z.coerce.number().optional(),
  paymentMode: z.enum(['cash', 'upi', 'card']).optional(),
  notes: z.string().optional(),
  
  // Guest details
  fullName: z.string().min(2, 'Guest full name must be at least 2 characters').trim(),
  phone: z.string().min(10, 'Valid 10-digit phone number is required').trim(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  idType: z.string().default('Aadhaar'),
  idLast4: z
    .string()
    .regex(/^\d{4}$/, 'Last 4 digits of ID must be exactly 4 digits')
    .optional()
    .or(z.literal('')),
  numberOfGuests: z.coerce.number().min(1, 'Number of guests must be at least 1').default(1),

  // Documents
  documents: z.array(documentUploadItemSchema).optional().default([]),
});

export const extendStaySchema = z.object({
  durationValue: z.coerce.number().min(1, 'Duration value must be at least 1'),
  durationUnit: z.enum(['hours', 'days']),
  notes: z.string().optional(),
});

export const checkOutSchema = z.object({
  notes: z.string().optional(),
  amount: z.coerce.number().optional(),
  paymentMode: z.enum(['cash', 'upi', 'card']).optional(),
});

export const hotelSchema = z.object({
  name: z.string().min(2, 'Hotel name is required'),
  city: z.string().min(2, 'City is required'),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().min(10, 'Phone is required'),
  isActive: z.boolean().default(true),
  createManagerAccount: z.boolean().optional(),
  managerName: z.string().optional(),
  managerEmail: z.string().optional(),
  managerPassword: z.string().optional(),
});

export const roomSchema = z.object({
  hotelId: z.string().min(1, 'Hotel is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  type: z.enum(['Single', 'Double', 'Deluxe', 'Suite', 'Family']),
  status: z.enum(['available', 'occupied', 'maintenance']).default('available'),
  floor: z.string().optional(),
  pricePerDay: z.coerce.number().min(0).optional(),
});

export const staffSchema = z.object({
  name: z.string().min(2, 'Staff name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['owner', 'staff']).default('staff'),
  hotelIds: z.array(z.string()).min(1, 'Assign at least one hotel to staff'),
  isActive: z.boolean().default(true),
});

export const cleanupDocumentsSchema = z.object({
  olderThanMonths: z.coerce.number().min(1, 'Months must be at least 1').max(60),
});
