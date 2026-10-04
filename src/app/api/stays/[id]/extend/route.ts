import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Stay } from '@/models/Stay';
import { getCurrentUser, hasHotelAccess } from '@/lib/auth';
import { extendStaySchema } from '@/lib/validations';
import { calculateExpectedCheckOut } from '@/lib/time';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parse = extendStaySchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message }, { status: 400 });
    }

    const { durationValue, durationUnit, notes } = parse.data;

    await connectDB();
    const stay = await Stay.findById(id);
    if (!stay) return NextResponse.json({ error: 'Stay not found' }, { status: 404 });

    if (!hasHotelAccess(user, stay.hotelId.toString())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (stay.status !== 'checked_in') {
      return NextResponse.json({ error: 'Cannot extend an already checked-out stay' }, { status: 400 });
    }

    // New check-out time is calculated from either existing expectedCheckOutAt or now (whichever is later)
    const baseTime = new Date(stay.expectedCheckOutAt) > new Date() ? new Date(stay.expectedCheckOutAt) : new Date();
    const newExpectedCheckOut = calculateExpectedCheckOut(baseTime, durationValue, durationUnit);

    stay.expectedCheckOutAt = newExpectedCheckOut;
    if (notes) {
      stay.notes = stay.notes ? `${stay.notes} | Extended +${durationValue} ${durationUnit}: ${notes}` : `Extended +${durationValue} ${durationUnit}: ${notes}`;
    }

    await stay.save();

    return NextResponse.json({
      success: true,
      message: `Stay extended by ${durationValue} ${durationUnit}`,
      expectedCheckOutAt: newExpectedCheckOut,
    });
  } catch (error) {
    console.error('Error extending stay:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
