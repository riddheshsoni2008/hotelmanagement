import { NextRequest, NextResponse } from 'next/server';
import { startOfDay, endOfDay, subDays, parseISO, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { connectDB } from '@/lib/db';
import { Stay } from '@/models/Stay';
import { Hotel } from '@/models/Hotel';
import { getCurrentUser, getAuthorizedHotelFilter } from '@/lib/auth';
import { TIMEZONE_IST, formatToIST } from '@/lib/time';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Owner only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const formatType = searchParams.get('format') || 'json';

    await connectDB();

    const now = new Date();
    const defaultStart = subDays(now, 30);

    const startDate = startDateParam ? parseISO(startDateParam) : defaultStart;
    const endDate = endDateParam ? parseISO(endDateParam) : now;

    const startUTC = startOfDay(startDate);
    const endUTC = endOfDay(endDate);

    const hotelFilter = getAuthorizedHotelFilter(user, hotelId);
    const dateQuery = {
      ...hotelFilter,
      checkInAt: { $gte: startUTC, $lte: endUTC },
    };

    const stays = await Stay.find(dateQuery)
      .populate('hotelId', 'name city')
      .populate('guestId', 'fullName phone idLast4 numberOfGuests')
      .populate('roomId', 'roomNumber type')
      .sort({ checkInAt: -1 })
      .lean();

    // Summary calculations
    let totalRevenue = 0;
    let totalGuests = 0;
    const hotelBreakdownMap = new Map<string, { hotelName: string; staysCount: number; guestsCount: number; revenue: number }>();
    const dayBreakdownMap = new Map<string, { date: string; staysCount: number; revenue: number }>();

    for (const stay of stays) {
      const guest = stay.guestId as unknown as { numberOfGuests?: number };
      const hotel = stay.hotelId as unknown as { _id?: string; name?: string };
      const guestsInStay = guest?.numberOfGuests || 1;
      const stayAmount = stay.amount || 0;

      totalGuests += guestsInStay;
      totalRevenue += stayAmount;

      // Hotel breakdown
      const hId = hotel?._id?.toString() || stay.hotelId.toString();
      const hName = hotel?.name || 'Hotel';
      const existingHotel = hotelBreakdownMap.get(hId) || {
        hotelName: hName,
        staysCount: 0,
        guestsCount: 0,
        revenue: 0,
      };
      existingHotel.staysCount += 1;
      existingHotel.guestsCount += guestsInStay;
      existingHotel.revenue += stayAmount;
      hotelBreakdownMap.set(hId, existingHotel);

      // Day breakdown (IST)
      const istDate = toZonedTime(new Date(stay.checkInAt), TIMEZONE_IST);
      const dayKey = format(istDate, 'yyyy-MM-dd');
      const existingDay = dayBreakdownMap.get(dayKey) || {
        date: dayKey,
        staysCount: 0,
        revenue: 0,
      };
      existingDay.staysCount += 1;
      existingDay.revenue += stayAmount;
      dayBreakdownMap.set(dayKey, existingDay);
    }

    const perHotel = Array.from(hotelBreakdownMap.values());
    const perDay = Array.from(dayBreakdownMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Handle CSV Export
    if (formatType === 'csv') {
      const headers = [
        'Stay ID',
        'Hotel',
        'Guest Name',
        'Guest Phone',
        'Guests Count',
        'Room Number',
        'Room Type',
        'Check-In (IST)',
        'Duration',
        'Expected Check-Out (IST)',
        'Actual Check-Out (IST)',
        'Status',
        'Amount (INR)',
        'Payment Mode',
        'Notes',
      ];

      const csvRows = [headers.join(',')];

      for (const s of stays) {
        const guest = s.guestId as unknown as { fullName?: string; phone?: string; numberOfGuests?: number };
        const hotel = s.hotelId as unknown as { name?: string };
        const room = s.roomId as unknown as { roomNumber?: string; type?: string };

        const row = [
          s._id.toString(),
          `"${(hotel?.name || '').replace(/"/g, '""')}"`,
          `"${(guest?.fullName || '').replace(/"/g, '""')}"`,
          `"${guest?.phone || ''}"`,
          guest?.numberOfGuests || 1,
          `"${room?.roomNumber || ''}"`,
          `"${room?.type || ''}"`,
          `"${formatToIST(s.checkInAt)}"`,
          `"${s.durationValue} ${s.durationUnit}"`,
          `"${formatToIST(s.expectedCheckOutAt)}"`,
          `"${formatToIST(s.actualCheckOutAt)}"`,
          s.status,
          s.amount || 0,
          s.paymentMode || '',
          `"${(s.notes || '').replace(/"/g, '""')}"`,
        ];

        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="hotel_report_${format(now, 'yyyyMMdd_HHmm')}.csv"`,
        },
      });
    }

    return NextResponse.json({
      summary: {
        totalStays: stays.length,
        totalGuests,
        totalRevenue,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      },
      perHotel,
      perDay,
      stays: stays.map((s) => {
        const guest = s.guestId as unknown as { fullName?: string; phone?: string; numberOfGuests?: number };
        const hotel = s.hotelId as unknown as { name?: string };
        const room = s.roomId as unknown as { roomNumber?: string; type?: string };

        return {
          id: s._id.toString(),
          hotelName: hotel?.name || '',
          guestName: guest?.fullName || '',
          guestPhone: guest?.phone || '',
          numberOfGuests: guest?.numberOfGuests || 1,
          roomNumber: room?.roomNumber || '',
          roomType: room?.type || '',
          checkInAt: s.checkInAt,
          expectedCheckOutAt: s.expectedCheckOutAt,
          actualCheckOutAt: s.actualCheckOutAt,
          durationValue: s.durationValue,
          durationUnit: s.durationUnit,
          status: s.status,
          amount: s.amount || 0,
          paymentMode: s.paymentMode,
          notes: s.notes,
        };
      }),
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
