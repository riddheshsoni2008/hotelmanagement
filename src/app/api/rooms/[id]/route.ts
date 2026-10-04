import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Room } from '@/models/Room';
import { getCurrentUser, hasHotelAccess } from '@/lib/auth';
import { roomSchema } from '@/lib/validations';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    await connectDB();
    const room = await Room.findById(id);
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    if (!hasHotelAccess(user, room.hotelId.toString())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Staff can only update room status (available, maintenance, etc.)
    if (user.role === 'staff') {
      if (body.status && ['available', 'occupied', 'maintenance'].includes(body.status)) {
        room.status = body.status;
        await room.save();
        return NextResponse.json({ success: true, room });
      }
      return NextResponse.json({ error: 'Staff can only update room status' }, { status: 403 });
    }

    // Owner can update all fields
    const parse = roomSchema.partial().safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message }, { status: 400 });
    }

    const updated = await Room.findByIdAndUpdate(id, parse.data, { new: true });
    return NextResponse.json({ success: true, room: updated });
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Owner only' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();
    await Room.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
