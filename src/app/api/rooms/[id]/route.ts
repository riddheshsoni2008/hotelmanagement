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

    const updateData: Record<string, unknown> = {};

    // Handle status & maintenance duration updates
    if (body.status && ['available', 'occupied', 'maintenance'].includes(body.status)) {
      updateData.status = body.status;

      if (body.status === 'maintenance') {
        let until: Date | null = null;
        if (body.maintenanceUntil) {
          until = new Date(body.maintenanceUntil);
        } else if (body.durationMinutes && Number(body.durationMinutes) > 0) {
          until = new Date(Date.now() + Number(body.durationMinutes) * 60000);
        } else {
          // Default 30 minutes if unspecified
          until = new Date(Date.now() + 30 * 60000);
        }
        updateData.maintenanceUntil = until;
        updateData.maintenanceReason = body.maintenanceReason?.trim() || 'General Maintenance (સમારકામ)';
      } else {
        // Reset maintenance schedule when room is available or occupied
        updateData.maintenanceUntil = null;
        updateData.maintenanceReason = null;
      }
    }

    // Staff can only update room status / maintenance
    if (user.role === 'staff') {
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Staff can only update room status' }, { status: 403 });
      }
      const updated = await Room.findByIdAndUpdate(id, updateData, { new: true });
      return NextResponse.json({ success: true, room: updated });
    }

    // Owner can update other room fields as well
    const parse = roomSchema.partial().safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message }, { status: 400 });
    }

    const finalData = { ...parse.data, ...updateData };
    const updated = await Room.findByIdAndUpdate(id, finalData, { new: true });
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
