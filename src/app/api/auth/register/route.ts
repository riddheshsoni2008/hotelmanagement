import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';
import { Room } from '@/models/Room';
import { signAuthToken, AUTH_COOKIE_NAME } from '@/lib/jwt';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  hotelName: z.string().min(2, 'Hotel name is required').trim(),
  hotelCity: z.string().min(2, 'City is required').trim(),
  hotelAddress: z.string().optional(),
  autoGenerateRooms: z.boolean().default(true),
  roomCount: z.coerce.number().min(1).max(50).default(10),
  defaultPrice: z.coerce.number().min(100).default(1500),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parse = registerSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const data = parse.data;

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please log in.' },
        { status: 409 }
      );
    }

    // Hash owner password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 1. Create Hotel
    const hotel = await Hotel.create({
      name: data.hotelName,
      city: data.hotelCity,
      address: data.hotelAddress?.trim() || `${data.hotelCity} Highway Road`,
      isActive: true,
    });

    // 2. Create Owner User
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'owner',
      hotelIds: [hotel._id],
      isActive: true,
    });

    // 3. Automated Room Generation (Zero manual data entry!)
    let roomsCreated = 0;
    if (data.autoGenerateRooms && data.roomCount > 0) {
      const roomsToInsert = [];
      const count = data.roomCount;

      for (let i = 1; i <= count; i++) {
        // Compute floor and room number: 1-10 -> 101-110, 11-20 -> 201-210, etc.
        const floorNum = Math.floor((i - 1) / 10) + 1;
        const indexOnFloor = ((i - 1) % 10) + 1;
        const roomNumber = `${floorNum}${indexOnFloor.toString().padStart(2, '0')}`;
        const floorName = `${floorNum}${floorNum === 1 ? 'st' : floorNum === 2 ? 'nd' : floorNum === 3 ? 'rd' : 'th'} Floor`;
        const roomType = indexOnFloor % 3 === 0 ? 'Suite' : indexOnFloor % 2 === 0 ? 'Deluxe' : 'Double AC';
        const price = indexOnFloor % 3 === 0 ? data.defaultPrice + 500 : data.defaultPrice;

        roomsToInsert.push({
          hotelId: hotel._id,
          roomNumber,
          floor: floorName,
          type: roomType,
          pricePerDay: price,
          status: 'available',
        });
      }

      if (roomsToInsert.length > 0) {
        await Room.insertMany(roomsToInsert);
        roomsCreated = roomsToInsert.length;
      }
    }

    // 4. Generate JWT Auth Token
    const token = await signAuthToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      hotelIds: [hotel._id.toString()],
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({
      success: true,
      message: 'Owner account and hotel created successfully!',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        hotelIds: [hotel._id.toString()],
      },
      hotel: {
        id: hotel._id.toString(),
        name: hotel.name,
        city: hotel.city,
      },
      roomsCreated,
    });

    // Set cookie for instant login
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred during account creation' },
      { status: 500 }
    );
  }
}
