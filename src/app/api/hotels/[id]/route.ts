import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Hotel } from '@/models/Hotel';
import { getCurrentUser, hasHotelAccess } from '@/lib/auth';
import { hotelSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!hasHotelAccess(user, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const hotel = await Hotel.findById(id).lean();
    if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });

    return NextResponse.json({ hotel });
  } catch (error) {
    console.error('Error getting hotel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Owner only' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parse = hotelSchema.partial().safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message }, { status: 400 });
    }

    await connectDB();
    const hotel = await Hotel.findByIdAndUpdate(id, parse.data, { new: true });
    if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });

    return NextResponse.json({ success: true, hotel });
  } catch (error) {
    console.error('Error updating hotel:', error);
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
    // Toggle isActive or delete
    const hotel = await Hotel.findById(id);
    if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });

    hotel.isActive = !hotel.isActive;
    await hotel.save();

    return NextResponse.json({
      success: true,
      message: `Hotel ${hotel.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: hotel.isActive,
    });
  } catch (error) {
    console.error('Error deleting hotel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
