import { NextRequest, NextResponse } from 'next/server';
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { connectDB } from '@/lib/db';
import { Stay } from '@/models/Stay';
import { Room } from '@/models/Room';
import { getCurrentUser, getAuthorizedHotelFilter } from '@/lib/auth';
import { TIMEZONE_IST } from '@/lib/time';

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
    // Compute start of day in IST
    const zonedNow = toZonedTime(now, TIMEZONE_IST);
    const todayStartIST = startOfDay(zonedNow);
    const todayEndIST = endOfDay(zonedNow);

    // Parallel queries for fast aggregation
    const [
      currentlyCheckedIn,
      availableRooms,
      occupiedRooms,
      maintenanceRooms,
      todayCheckIns,
      todayCheckOuts,
      overstayCount,
      activeStays,
    ] = await Promise.all([
      Stay.countDocuments({
        ...hotelFilter,
        status: 'checked_in',
      }),
      Room.countDocuments({
        ...hotelFilter,
        status: 'available',
      }),
      Room.countDocuments({
        ...hotelFilter,
        status: 'occupied',
      }),
      Room.countDocuments({
        ...hotelFilter,
        status: 'maintenance',
      }),
      Stay.countDocuments({
        ...hotelFilter,
        checkInAt: { $gte: todayStartIST, $lte: todayEndIST },
      }),
      Stay.countDocuments({
        ...hotelFilter,
        status: 'checked_out',
        actualCheckOutAt: { $gte: todayStartIST, $lte: todayEndIST },
      }),
      Stay.countDocuments({
        ...hotelFilter,
        status: 'checked_in',
        expectedCheckOutAt: { $lt: now },
      }),
      Stay.find({
        ...hotelFilter,
        status: 'checked_in',
      })
        .populate('hotelId', 'name city')
        .populate('guestId', 'fullName phone idLast4 numberOfGuests')
        .populate('roomId', 'roomNumber type')
        .sort({ expectedCheckOutAt: 1 }) // Stays closest to checkout or overdue first
        .lean(),
    ]);

    return NextResponse.json({
      stats: {
        currentlyCheckedIn,
        availableRooms,
        occupiedRooms,
        maintenanceRooms,
        totalRooms: availableRooms + occupiedRooms + maintenanceRooms,
        todayCheckIns,
        todayCheckOuts,
        overstayCount,
      },
      activeStays: activeStays.map((s) => {
        const guest = s.guestId as unknown as { _id?: string; fullName?: string; phone?: string; idLast4?: string; numberOfGuests?: number };
        const room = s.roomId as unknown as { _id?: string; roomNumber?: string; type?: string };
        const hotel = s.hotelId as unknown as { _id?: string; name?: string; city?: string };
        const isOverstay = new Date(s.expectedCheckOutAt) < now;

        return {
          id: s._id.toString(),
          hotelId: hotel?._id?.toString() || s.hotelId.toString(),
          hotelName: hotel?.name || '',
          hotelCity: hotel?.city || '',
          guestId: guest?._id?.toString() || s.guestId.toString(),
          guestName: guest?.fullName || 'Guest',
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
          isOverstay,
          amount: s.amount,
          paymentMode: s.paymentMode,
          notes: s.notes,
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
