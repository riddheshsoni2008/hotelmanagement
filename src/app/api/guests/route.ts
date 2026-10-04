import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Guest } from '@/models/Guest';
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
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    await connectDB();

    const hotelFilter = getAuthorizedHotelFilter(user, hotelId);
    const query: Record<string, unknown> = { ...hotelFilter };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [{ fullName: searchRegex }, { phone: searchRegex }, { city: searchRegex }];
    }

    const skip = (page - 1) * limit;
    const [guests, total] = await Promise.all([
      Guest.find(query)
        .populate('hotelId', 'name city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Guest.countDocuments(query),
    ]);

    // Attach stays count for each guest
    const guestIds = guests.map((g) => g._id);
    const staysAgg = await Stay.aggregate([
      { $match: { guestId: { $in: guestIds } } },
      { $group: { _id: '$guestId', count: { $sum: 1 } } },
    ]);
    const stayCountMap = new Map(staysAgg.map((s) => [s._id.toString(), s.count]));

    return NextResponse.json({
      guests: guests.map((g) => ({
        id: g._id.toString(),
        hotelId: (g.hotelId as unknown as { _id?: { toString: () => string } })?._id?.toString() || g.hotelId.toString(),
        hotelName: (g.hotelId as unknown as { name?: string })?.name || '',
        fullName: g.fullName,
        phone: g.phone,
        email: g.email || '',
        city: g.city || '',
        address: g.address || '',
        idType: g.idType,
        idLast4: g.idLast4 || '',
        numberOfGuests: g.numberOfGuests,
        staysCount: stayCountMap.get(g._id.toString()) || 0,
        createdAt: g.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching guests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
