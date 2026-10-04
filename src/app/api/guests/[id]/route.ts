import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Guest } from '@/models/Guest';
import { GuestDocument } from '@/models/GuestDocument';
import { Stay } from '@/models/Stay';
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

    const guest = await Guest.findById(id).populate('hotelId', 'name city').lean();
    if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

    const hotelIdStr = (guest.hotelId as unknown as { _id?: { toString: () => string } })?._id?.toString() || guest.hotelId.toString();
    if (!hasHotelAccess(user, hotelIdStr)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get documents metadata (without heavy data buffer)
    const documents = await GuestDocument.find({ guestId: guest._id })
      .select('_id kind contentType sizeBytes createdAt')
      .lean();

    // Get stay history for this guest
    const stays = await Stay.find({ guestId: guest._id })
      .populate('hotelId', 'name city')
      .populate('roomId', 'roomNumber type')
      .sort({ checkInAt: -1 })
      .lean();

    // Also get previous stays by same phone number across hotels (if returning guest)
    const allGuestsWithPhone = await Guest.find({
      phone: guest.phone,
      _id: { $ne: guest._id },
    }).select('_id');

    let otherStays: typeof stays = [];
    if (allGuestsWithPhone.length > 0) {
      otherStays = await Stay.find({
        guestId: { $in: allGuestsWithPhone.map((g) => g._id) },
      })
        .populate('hotelId', 'name city')
        .populate('roomId', 'roomNumber type')
        .sort({ checkInAt: -1 })
        .lean();
    }

    return NextResponse.json({
      guest: {
        id: guest._id.toString(),
        hotelId: hotelIdStr,
        hotelName: (guest.hotelId as { name?: string })?.name || '',
        fullName: guest.fullName,
        phone: guest.phone,
        email: guest.email || '',
        address: guest.address || '',
        city: guest.city || '',
        idType: guest.idType,
        idLast4: guest.idLast4 || '',
        numberOfGuests: guest.numberOfGuests,
        notes: guest.notes || '',
        createdAt: guest.createdAt,
      },
      documents: documents.map((d) => ({
        id: d._id.toString(),
        kind: d.kind,
        contentType: d.contentType,
        sizeBytes: d.sizeBytes,
        url: `/api/documents/${d._id}`,
        createdAt: d.createdAt,
      })),
      stays: [...stays, ...otherStays].map((s) => ({
        id: s._id.toString(),
        hotelName: (s.hotelId as { name?: string })?.name || '',
        roomNumber: (s.roomId as { roomNumber?: string })?.roomNumber || '',
        roomType: (s.roomId as { type?: string })?.type || '',
        checkInAt: s.checkInAt,
        durationValue: s.durationValue,
        durationUnit: s.durationUnit,
        expectedCheckOutAt: s.expectedCheckOutAt,
        actualCheckOutAt: s.actualCheckOutAt,
        status: s.status,
        amount: s.amount,
        paymentMode: s.paymentMode,
        notes: s.notes,
      })),
    });
  } catch (error) {
    console.error('Error getting guest detail:', error);
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
    const guest = await Guest.findById(id);
    if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

    if (!hasHotelAccess(user, guest.hotelId.toString())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (body.fullName) guest.fullName = body.fullName.trim();
    if (body.phone) guest.phone = body.phone.trim();
    if (body.email !== undefined) guest.email = body.email.trim();
    if (body.address !== undefined) guest.address = body.address.trim();
    if (body.city !== undefined) guest.city = body.city.trim();
    if (body.idLast4 !== undefined) guest.idLast4 = body.idLast4.trim();
    if (body.numberOfGuests !== undefined) guest.numberOfGuests = Number(body.numberOfGuests);
    if (body.notes !== undefined) guest.notes = body.notes.trim();

    await guest.save();
    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error('Error updating guest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
