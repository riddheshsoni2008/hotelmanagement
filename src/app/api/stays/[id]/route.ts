import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Stay } from '@/models/Stay';
import { GuestDocument } from '@/models/GuestDocument';
import { getCurrentUser, hasHotelAccess } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();

    const stay = await Stay.findById(id)
      .populate('hotelId', 'name city address phone')
      .populate('guestId', 'fullName phone email address city idType idLast4 numberOfGuests notes')
      .populate('roomId', 'roomNumber type status floor pricePerDay')
      .lean();

    if (!stay) {
      return NextResponse.json({ error: 'Stay record not found' }, { status: 404 });
    }

    const hotelIdStr = (stay.hotelId as unknown as { _id?: { toString: () => string } })?._id?.toString() || stay.hotelId.toString();
    if (!hasHotelAccess(user, hotelIdStr)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch documents metadata for this guest
    const guestObj = stay.guestId as unknown as { _id?: string };
    const guestId = guestObj?._id || stay.guestId;
    const documents = await GuestDocument.find({ guestId })
      .select('_id kind contentType sizeBytes createdAt')
      .lean();

    // Check past stays for this guest
    const guestStays = await Stay.find({
      guestId,
      _id: { $ne: stay._id },
    })
      .populate('hotelId', 'name city')
      .populate('roomId', 'roomNumber type')
      .sort({ checkInAt: -1 })
      .lean();

    const now = new Date();
    const isOverstay = stay.status === 'checked_in' && new Date(stay.expectedCheckOutAt) < now;

    return NextResponse.json({
      stay: {
        id: stay._id.toString(),
        hotelId: hotelIdStr,
        hotel: stay.hotelId,
        guestId: guestId.toString(),
        guest: stay.guestId,
        roomId: (stay.roomId as unknown as { _id?: { toString: () => string } })?._id?.toString() || stay.roomId.toString(),
        room: stay.roomId,
        checkInAt: stay.checkInAt,
        durationValue: stay.durationValue,
        durationUnit: stay.durationUnit,
        expectedCheckOutAt: stay.expectedCheckOutAt,
        actualCheckOutAt: stay.actualCheckOutAt,
        status: stay.status,
        isOverstay,
        amount: stay.amount,
        paymentMode: stay.paymentMode,
        notes: stay.notes,
        createdAt: stay.createdAt,
      },
      documents: documents.map((d) => ({
        id: d._id.toString(),
        kind: d.kind,
        contentType: d.contentType,
        sizeBytes: d.sizeBytes,
        url: `/api/documents/${d._id}`,
        createdAt: d.createdAt,
      })),
      pastStays: guestStays.map((s) => ({
        id: s._id.toString(),
        hotelName: (s.hotelId as { name?: string })?.name || '',
        roomNumber: (s.roomId as { roomNumber?: string })?.roomNumber || '',
        roomType: (s.roomId as { type?: string })?.type || '',
        checkInAt: s.checkInAt,
        expectedCheckOutAt: s.expectedCheckOutAt,
        actualCheckOutAt: s.actualCheckOutAt,
        durationValue: s.durationValue,
        durationUnit: s.durationUnit,
        status: s.status,
      })),
    });
  } catch (error) {
    console.error('Error fetching stay detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const stay = await Stay.findById(id);
    if (!stay) return NextResponse.json({ error: 'Stay not found' }, { status: 404 });

    if (!hasHotelAccess(user, stay.hotelId.toString())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (body.amount !== undefined) stay.amount = Number(body.amount);
    if (body.paymentMode !== undefined) stay.paymentMode = body.paymentMode;
    if (body.notes !== undefined) stay.notes = body.notes;

    await stay.save();
    return NextResponse.json({ success: true, stay });
  } catch (error) {
    console.error('Error updating stay:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
