import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Stay } from '@/models/Stay';
import { Guest } from '@/models/Guest';
import { Room } from '@/models/Room';
import { GuestDocument, MAX_DOCUMENT_SIZE_BYTES } from '@/models/GuestDocument';
import { getCurrentUser, getAuthorizedHotelFilter, hasHotelAccess } from '@/lib/auth';
import { checkInSchema } from '@/lib/validations';
import { calculateExpectedCheckOut } from '@/lib/time';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    await connectDB();

    const hotelFilter = getAuthorizedHotelFilter(user, hotelId);
    const query: Record<string, unknown> = { ...hotelFilter };

    const now = new Date();

    if (status === 'checked_in') {
      query.status = 'checked_in';
      query.expectedCheckOutAt = { $gte: now };
    } else if (status === 'overstay') {
      query.status = 'checked_in';
      query.expectedCheckOutAt = { $lt: now };
    } else if (status === 'checked_out') {
      query.status = 'checked_out';
    }

    if (search) {
      // Find matching guest IDs or room numbers
      const matchingGuests = await Guest.find({
        $or: [
          { fullName: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
        ],
      }).select('_id');

      const matchingRooms = await Room.find({
        roomNumber: new RegExp(search, 'i'),
      }).select('_id');

      query.$or = [
        { guestId: { $in: matchingGuests.map((g) => g._id) } },
        { roomId: { $in: matchingRooms.map((r) => r._id) } },
      ];
    }

    const skip = (page - 1) * limit;
    const [stays, total] = await Promise.all([
      Stay.find(query)
        .populate('hotelId', 'name city')
        .populate('guestId', 'fullName phone email idLast4 numberOfGuests')
        .populate('roomId', 'roomNumber type status')
        .sort({ checkInAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Stay.countDocuments(query),
    ]);

    return NextResponse.json({
      stays: stays.map((s) => {
        const guest = s.guestId as unknown as { _id?: string; fullName?: string; phone?: string; idLast4?: string; numberOfGuests?: number };
        const room = s.roomId as unknown as { _id?: string; roomNumber?: string; type?: string };
        const hotel = s.hotelId as unknown as { _id?: string; name?: string; city?: string };
        const isOverstay = s.status === 'checked_in' && new Date(s.expectedCheckOutAt) < now;

        return {
          id: s._id.toString(),
          hotelId: hotel?._id?.toString() || s.hotelId.toString(),
          hotelName: hotel?.name || '',
          hotelCity: hotel?.city || '',
          guestId: guest?._id?.toString() || s.guestId.toString(),
          guestName: guest?.fullName || 'Unknown Guest',
          guestPhone: guest?.phone || '',
          guestIdLast4: guest?.idLast4 || '',
          numberOfGuests: guest?.numberOfGuests || 1,
          roomId: room?._id?.toString() || s.roomId.toString(),
          roomNumber: room?.roomNumber || '',
          roomType: room?.type || '',
          checkInAt: s.checkInAt,
          durationValue: s.durationValue,
          durationUnit: s.durationUnit,
          expectedCheckOutAt: s.expectedCheckOutAt,
          actualCheckOutAt: s.actualCheckOutAt,
          status: s.status,
          isOverstay,
          amount: s.amount,
          paymentMode: s.paymentMode,
          notes: s.notes,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching stays:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parse = checkInSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const data = parse.data;

    // Check hotel access
    if (!hasHotelAccess(user, data.hotelId)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission for this hotel' },
        { status: 403 }
      );
    }

    await connectDB();

    // Verify room availability
    const room = await Room.findById(data.roomId);
    if (!room) {
      return NextResponse.json({ error: 'Selected room not found' }, { status: 404 });
    }
    if (room.hotelId.toString() !== data.hotelId) {
      return NextResponse.json({ error: 'Room does not belong to selected hotel' }, { status: 400 });
    }
    if (room.status === 'occupied') {
      return NextResponse.json(
        { error: `Room ${room.roomNumber} is currently occupied` },
        { status: 400 }
      );
    }

    // Server-side validation on documents (size <= 40KB and image type)
    if (data.documents && data.documents.length > 0) {
      for (const doc of data.documents) {
        const buffer = Buffer.from(doc.dataBase64, 'base64');
        if (buffer.length > MAX_DOCUMENT_SIZE_BYTES) {
          return NextResponse.json(
            {
              error: `Document ${doc.kind} size (${buffer.length} bytes) exceeds 40KB limit.`,
            },
            { status: 413 }
          );
        }
      }
    }

    // 1. Create or find Guest
    let guest = await Guest.findOne({
      hotelId: data.hotelId,
      phone: data.phone,
    });

    if (guest) {
      guest.fullName = data.fullName;
      if (data.email) guest.email = data.email;
      if (data.address) guest.address = data.address;
      if (data.city) guest.city = data.city;
      if (data.idLast4) guest.idLast4 = data.idLast4;
      guest.numberOfGuests = data.numberOfGuests;
      if (data.notes) guest.notes = data.notes;
      await guest.save();
    } else {
      guest = await Guest.create({
        hotelId: data.hotelId,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        idType: data.idType || 'Aadhaar',
        idLast4: data.idLast4 || undefined,
        numberOfGuests: data.numberOfGuests,
        notes: data.notes || undefined,
        createdBy: user.userId,
      });
    }

    // 2. Save Guest Documents in separate GuestDocument collection
    if (data.documents && data.documents.length > 0) {
      for (const doc of data.documents) {
        const buffer = Buffer.from(doc.dataBase64, 'base64');
        // Delete existing of same kind if replacing
        await GuestDocument.deleteMany({ guestId: guest._id, kind: doc.kind });
        await GuestDocument.create({
          guestId: guest._id,
          hotelId: data.hotelId,
          kind: doc.kind,
          contentType: doc.contentType,
          data: buffer,
          sizeBytes: buffer.length,
        });
      }
    }

    // 3. Calculate expected check out time
    const checkInTime = data.checkInAt ? new Date(data.checkInAt) : new Date();
    const expectedCheckOutAt = calculateExpectedCheckOut(
      checkInTime,
      data.durationValue,
      data.durationUnit
    );

    // 4. Create Stay
    const stay = await Stay.create({
      hotelId: data.hotelId,
      guestId: guest._id,
      roomId: room._id,
      checkInAt: checkInTime,
      durationValue: data.durationValue,
      durationUnit: data.durationUnit,
      expectedCheckOutAt,
      status: 'checked_in',
      amount: data.amount,
      paymentMode: data.paymentMode,
      notes: data.notes,
      createdBy: user.userId,
    });

    // 5. Mark room as occupied
    room.status = 'occupied';
    await room.save();

    return NextResponse.json({
      success: true,
      stayId: stay._id.toString(),
      guestId: guest._id.toString(),
      message: 'Guest checked in successfully',
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
