import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Guest } from '@/models/Guest';
import { Stay } from '@/models/Stay';
import { GuestDocument } from '@/models/GuestDocument';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone')?.trim();

    if (!phone || phone.length < 5) {
      return NextResponse.json({ found: false });
    }

    await connectDB();

    // Look for matching guest by phone (most recent first)
    const guest = await Guest.findOne({ phone: new RegExp(phone.slice(-10), 'i') })
      .sort({ createdAt: -1 })
      .lean();

    if (!guest) {
      return NextResponse.json({ found: false });
    }

    // Check count of stays
    const staysCount = await Stay.countDocuments({ guestId: guest._id });

    // Check existing documents
    const documents = await GuestDocument.find({ guestId: guest._id })
      .select('_id kind contentType sizeBytes createdAt')
      .lean();

    return NextResponse.json({
      found: true,
      guest: {
        id: guest._id.toString(),
        fullName: guest.fullName,
        phone: guest.phone,
        email: guest.email || '',
        address: guest.address || '',
        city: guest.city || '',
        idType: guest.idType || 'Aadhaar',
        idLast4: guest.idLast4 || '',
        numberOfGuests: guest.numberOfGuests || 1,
        notes: guest.notes || '',
        staysCount,
        documents: documents.map((d) => ({
          id: d._id.toString(),
          kind: d.kind,
          sizeBytes: d.sizeBytes,
        })),
      },
    });
  } catch (error) {
    console.error('Error in guest lookup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
