import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Room } from '@/models/Room';
import { getCurrentUser, hasHotelAccess } from '@/lib/auth';
import { z } from 'zod';

const bulkRoomsSchema = z.object({
  hotelId: z.string().min(1, 'Please select a hotel'),
  startNumber: z.coerce.number().min(1).default(101),
  count: z.coerce.number().min(1).max(50).default(10),
  floor: z.string().default('1st Floor'),
  type: z.string().default('Double AC'),
  pricePerDay: z.coerce.number().min(100).default(1500),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parse = bulkRoomsSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const data = parse.data;

    if (!hasHotelAccess(user, data.hotelId)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission for this hotel' },
        { status: 403 }
      );
    }

    await connectDB();

    // Find existing rooms to avoid duplicates
    const existingRooms = await Room.find({ hotelId: data.hotelId }).select('roomNumber').lean();
    const existingRoomNumbers = new Set(existingRooms.map((r) => r.roomNumber));

    const roomsToInsert = [];
    let currentNum = data.startNumber;

    for (let i = 0; i < data.count; i++) {
      const roomNumberStr = currentNum.toString();
      if (!existingRoomNumbers.has(roomNumberStr)) {
        roomsToInsert.push({
          hotelId: data.hotelId,
          roomNumber: roomNumberStr,
          floor: data.floor,
          type: data.type,
          pricePerDay: data.pricePerDay,
          status: 'available',
        });
      }
      currentNum++;
    }

    if (roomsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'All room numbers in this range already exist. Please change the starting number.' },
        { status: 400 }
      );
    }

    const inserted = await Room.insertMany(roomsToInsert);

    return NextResponse.json({
      success: true,
      message: `Successfully created ${inserted.length} new rooms!`,
      count: inserted.length,
    });
  } catch (error) {
    console.error('Error generating bulk rooms:', error);
    return NextResponse.json(
      { error: 'Failed to auto-generate rooms' },
      { status: 500 }
    );
  }
}
