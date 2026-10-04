import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Hotel } from '@/models/Hotel';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    let hotels;
    if (user.role === 'owner') {
      hotels = await Hotel.find({ isActive: true }).sort({ name: 1 }).lean();
    } else {
      hotels = await Hotel.find({ _id: { $in: user.hotelIds }, isActive: true })
        .sort({ name: 1 })
        .lean();
    }

    return NextResponse.json({
      user,
      hotels: hotels.map((h) => ({
        id: h._id.toString(),
        name: h.name,
        city: h.city,
        address: h.address,
        phone: h.phone,
      })),
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
