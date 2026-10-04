import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Room } from '@/models/Room';
import { getCurrentUser, hasHotelAccess } from '@/lib/auth';
import { roomSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    const status = searchParams.get('status');

    await connectDB();

    const query: Record<string, unknown> = {};

    if (hotelId && hotelId !== 'all') {
      if (!hasHotelAccess(user, hotelId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.hotelId = hotelId;
    } else {
      if (user.role !== 'owner') {
        query.hotelId = { $in: user.hotelIds };
      }
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const rooms = await Room.find(query)
      .populate('hotelId', 'name city')
      .sort({ roomNumber: 1 })
      .lean();

    return NextResponse.json({
      rooms: rooms.map((r) => ({
        id: r._id.toString(),
        hotelId: (r.hotelId as unknown as { _id?: { toString: () => string }; name?: string })?._id?.toString() || r.hotelId.toString(),
        hotelName: (r.hotelId as unknown as { name?: string })?.name || '',
        roomNumber: r.roomNumber,
        type: r.type,
        status: r.status,
        floor: r.floor,
        pricePerDay: r.pricePerDay,
        maintenanceUntil: r.maintenanceUntil ? new Date(r.maintenanceUntil).toISOString() : null,
        maintenanceReason: r.maintenanceReason || null,
      })),
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Only owners can create rooms' }, { status: 403 });
    }

    const body = await request.json();
    const parse = roomSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message }, { status: 400 });
    }

    await connectDB();

    // Check duplicate room number in same hotel
    const exists = await Room.findOne({
      hotelId: parse.data.hotelId,
      roomNumber: parse.data.roomNumber,
    });
    if (exists) {
      return NextResponse.json(
        { error: `Room ${parse.data.roomNumber} already exists in this hotel` },
        { status: 400 }
      );
    }

    const room = await Room.create(parse.data);
    return NextResponse.json({ success: true, room }, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
