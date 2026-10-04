import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Stay } from '@/models/Stay';
import { getCurrentUser, getAuthorizedHotelFilter } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');

    await connectDB();

    const hotelFilter = getAuthorizedHotelFilter(user, hotelId);
    const now = new Date();

    const activeStays = await Stay.find({
      ...hotelFilter,
      status: 'checked_in',
      expectedCheckOutAt: { $lte: now },
    })
      .populate('hotelId', 'name city phone address')
      .populate('guestId', 'fullName phone idLast4 numberOfGuests')
      .populate('roomId', 'roomNumber type floor')
      .sort({ expectedCheckOutAt: 1 })
      .lean();

    const formatted = activeStays.map((s) => {
      const guest = s.guestId as unknown as {
        _id?: string;
        fullName?: string;
        phone?: string;
        idLast4?: string;
        numberOfGuests?: number;
      };
      const room = s.roomId as unknown as {
        _id?: string;
        roomNumber?: string;
        type?: string;
        floor?: string;
      };
      const hotel = s.hotelId as unknown as {
        _id?: string;
        name?: string;
        city?: string;
        phone?: string;
        address?: string;
      };

      const expectedOut = new Date(s.expectedCheckOutAt);
      const overdueMs = Math.max(0, now.getTime() - expectedOut.getTime());
      const overdueMinutes = Math.floor(overdueMs / (1000 * 60));
      const isCritical = overdueMinutes >= 10;

      return {
        id: s._id.toString(),
        hotelId: hotel?._id?.toString() || s.hotelId.toString(),
        hotelName: hotel?.name || '',
        hotelCity: hotel?.city || '',
        hotelPhone: hotel?.phone || '',
        guestId: guest?._id?.toString() || s.guestId.toString(),
        guestName: guest?.fullName || 'Guest',
        guestPhone: guest?.phone || '',
        guestIdLast4: guest?.idLast4 || '',
        numberOfGuests: guest?.numberOfGuests || 1,
        roomId: room?._id?.toString() || s.roomId.toString(),
        roomNumber: room?.roomNumber || '',
        roomType: room?.type || '',
        roomFloor: room?.floor || '',
        checkInAt: s.checkInAt,
        expectedCheckOutAt: s.expectedCheckOutAt,
        durationValue: s.durationValue,
        durationUnit: s.durationUnit,
        amount: s.amount,
        paymentMode: s.paymentMode,
        notes: s.notes,
        overdueMinutes,
        isCritical,
      };
    });

    const criticalStays = formatted.filter((item) => item.isCritical);

    return NextResponse.json({
      overdueStays: formatted,
      criticalStays,
      criticalCount: criticalStays.length,
      totalOverdueCount: formatted.length,
    });
  } catch (error) {
    console.error('Error fetching overdue stays:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
