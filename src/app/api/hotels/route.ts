import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { Hotel } from '@/models/Hotel';
import { Room } from '@/models/Room';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { hotelSchema } from '@/lib/validations';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const query = user.role === 'owner' ? {} : { _id: { $in: user.hotelIds }, isActive: true };
    const hotels = await Hotel.find(query).sort({ name: 1 }).lean();

    // Include room counts for each hotel
    const hotelIds = hotels.map((h) => h._id);
    const roomCounts = await Room.aggregate([
      { $match: { hotelId: { $in: hotelIds } } },
      { $group: { _id: '$hotelId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(roomCounts.map((r) => [r._id.toString(), r.count]));

    // Fetch staff assigned to these hotels
    const staffMembers = await User.find({
      hotelIds: { $in: hotelIds },
      role: 'staff',
    })
      .select('name email hotelIds isActive')
      .lean();

    const staffMap = new Map<string, Array<{ id: string; name: string; email: string; isActive: boolean }>>();
    for (const sm of staffMembers) {
      for (const hid of sm.hotelIds || []) {
        const hidStr = hid.toString();
        if (!staffMap.has(hidStr)) {
          staffMap.set(hidStr, []);
        }
        staffMap.get(hidStr)!.push({
          id: sm._id.toString(),
          name: sm.name,
          email: sm.email,
          isActive: sm.isActive,
        });
      }
    }

    return NextResponse.json({
      hotels: hotels.map((h) => ({
        id: h._id.toString(),
        name: h.name,
        city: h.city,
        address: h.address,
        phone: h.phone,
        isActive: h.isActive,
        roomCount: countMap.get(h._id.toString()) || 0,
        staff: staffMap.get(h._id.toString()) || [],
      })),
    });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Only owners can create hotels' }, { status: 403 });
    }

    const body = await request.json();
    const parse = hotelSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message }, { status: 400 });
    }

    const {
      name,
      city,
      address,
      phone,
      isActive,
      createManagerAccount,
      managerName,
      managerEmail,
      managerPassword,
    } = parse.data;

    await connectDB();

    // Check manager account details if requested
    let cleanManagerEmail = '';
    let passwordHash = '';
    if (createManagerAccount || managerEmail || managerPassword) {
      if (!managerEmail || typeof managerEmail !== 'string' || !managerEmail.includes('@')) {
        return NextResponse.json(
          { error: 'Please enter a valid email address for the manager login' },
          { status: 400 }
        );
      }
      cleanManagerEmail = managerEmail.toLowerCase().trim();

      if (!managerPassword || typeof managerPassword !== 'string' || managerPassword.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      const existingUser = await User.findOne({ email: cleanManagerEmail });
      if (existingUser) {
        return NextResponse.json(
          { error: `A user with email "${cleanManagerEmail}" already exists. Please choose a different email.` },
          { status: 400 }
        );
      }

      passwordHash = await bcrypt.hash(managerPassword, 10);
    }

    // 1. Create the hotel property
    const hotel = await Hotel.create({
      name,
      city,
      address,
      phone,
      isActive: isActive !== undefined ? isActive : true,
    });

    // 2. If manager credentials provided, create the staff/manager user assigned strictly to this hotel
    let createdManager = null;
    if (cleanManagerEmail && passwordHash) {
      const userDoc = await User.create({
        name: (managerName && managerName.trim()) || `${name} Manager`,
        email: cleanManagerEmail,
        passwordHash,
        role: 'staff',
        hotelIds: [hotel._id],
        isActive: true,
      });

      createdManager = {
        id: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
      };
    }

    return NextResponse.json(
      {
        success: true,
        hotel: {
          id: hotel._id.toString(),
          name: hotel.name,
          city: hotel.city,
          address: hotel.address,
          phone: hotel.phone,
          isActive: hotel.isActive,
        },
        managerUser: createdManager,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating hotel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
