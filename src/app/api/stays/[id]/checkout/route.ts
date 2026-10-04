import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Stay } from '@/models/Stay';
import { Room } from '@/models/Room';
import { getCurrentUser, hasHotelAccess } from '@/lib/auth';
import { differenceInMinutes } from 'date-fns';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    await connectDB();
    const stay = await Stay.findById(id);
    if (!stay) return NextResponse.json({ error: 'Stay not found' }, { status: 404 });

    if (!hasHotelAccess(user, stay.hotelId.toString())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (stay.status === 'checked_out') {
      return NextResponse.json({ error: 'Stay is already checked out' }, { status: 400 });
    }

    const now = new Date();
    stay.actualCheckOutAt = now;
    stay.status = 'checked_out';

    if (body.notes) {
      stay.notes = stay.notes ? `${stay.notes} | ${body.notes}` : body.notes;
    }
    if (body.amount !== undefined) {
      stay.amount = Number(body.amount);
    }
    if (body.paymentMode) {
      stay.paymentMode = body.paymentMode;
    }

    await stay.save();

    // Free the room
    await Room.findByIdAndUpdate(stay.roomId, { status: 'available' });

    // Calculate early or late
    const diffMinutes = differenceInMinutes(now, new Date(stay.expectedCheckOutAt));
    let timingDescription = 'On time';
    if (diffMinutes > 15) {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      timingDescription = `Late check-out by ${hours > 0 ? `${hours}h ` : ''}${mins}m`;
    } else if (diffMinutes < -15) {
      const earlyMin = Math.abs(diffMinutes);
      const hours = Math.floor(earlyMin / 60);
      const mins = earlyMin % 60;
      timingDescription = `Early check-out by ${hours > 0 ? `${hours}h ` : ''}${mins}m`;
    }

    return NextResponse.json({
      success: true,
      message: `Checked out successfully (${timingDescription})`,
      actualCheckOutAt: now,
      timingDescription,
      diffMinutes,
    });
  } catch (error) {
    console.error('Error during check-out:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
