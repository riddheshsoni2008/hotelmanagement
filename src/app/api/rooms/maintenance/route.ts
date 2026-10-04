import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Room } from '@/models/Room';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');

    await connectDB();

    const query: Record<string, unknown> = {
      status: 'maintenance',
    };

    if (hotelId && hotelId !== 'all') {
      query.hotelId = hotelId;
    } else if (user.role !== 'owner') {
      query.hotelId = { $in: user.hotelIds };
    }

    const rooms = await Room.find(query)
      .populate('hotelId', 'name city')
      .sort({ roomNumber: 1 })
      .lean();

    const now = new Date();

    const result = rooms.map((r) => {
      const until = r.maintenanceUntil ? new Date(r.maintenanceUntil) : null;
      const isCompleted = until ? until <= now : false;
      const remainingMs = until ? until.getTime() - now.getTime() : 0;
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      const overdueMinutes = until && isCompleted ? Math.floor((now.getTime() - until.getTime()) / 60000) : 0;

      return {
        id: r._id.toString(),
        hotelId: (r.hotelId as unknown as { _id?: { toString: () => string }; name?: string })?._id?.toString() || r.hotelId.toString(),
        hotelName: (r.hotelId as unknown as { name?: string })?.name || '',
        roomNumber: r.roomNumber,
        type: r.type,
        floor: r.floor,
        pricePerDay: r.pricePerDay,
        status: r.status,
        maintenanceUntil: until ? until.toISOString() : null,
        maintenanceReason: r.maintenanceReason || 'General Maintenance',
        isCompleted,
        remainingMinutes: isCompleted ? 0 : Math.max(0, remainingMinutes),
        overdueMinutes,
      };
    });

    const completedRooms = result.filter((r) => r.isCompleted);

    return NextResponse.json({
      allMaintenanceRooms: result,
      completedRooms,
      hasCompleted: completedRooms.length > 0,
      totalCount: result.length,
      completedCount: completedRooms.length,
    });
  } catch (error) {
    console.error('Error fetching maintenance rooms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const completeSchema = z.object({
  roomIds: z.array(z.string().min(1)).min(1, 'At least one room ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parse = completeSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify rooms and update them to available
    const query: Record<string, unknown> = {
      _id: { $in: parse.data.roomIds },
      status: 'maintenance',
    };

    if (user.role !== 'owner') {
      query.hotelId = { $in: user.hotelIds };
    }

    const roomsToUpdate = await Room.find(query).select('_id roomNumber').lean();
    if (roomsToUpdate.length === 0) {
      return NextResponse.json(
        { error: 'No matching maintenance rooms found to update' },
        { status: 404 }
      );
    }

    const roomIdsToUpdate = roomsToUpdate.map((r) => r._id);
    const roomNumbers = roomsToUpdate.map((r) => r.roomNumber);

    await Room.updateMany(
      { _id: { $in: roomIdsToUpdate } },
      {
        $set: {
          status: 'available',
          maintenanceUntil: null,
          maintenanceReason: null,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Marked ${roomNumbers.length} room(s) as available`,
      updatedCount: roomNumbers.length,
      roomNumbers,
    });
  } catch (error) {
    console.error('Error completing maintenance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
