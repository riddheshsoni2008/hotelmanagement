import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GuestDocument, MAX_DOCUMENT_SIZE_BYTES } from '@/models/GuestDocument';
import { Guest } from '@/models/Guest';
import { getCurrentUser, hasHotelAccess } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { guestId, kind, contentType, dataBase64 } = body;

    if (!guestId || !kind || !contentType || !dataBase64) {
      return NextResponse.json(
        { error: 'guestId, kind, contentType, and dataBase64 are required' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(dataBase64, 'base64');
    if (buffer.length > MAX_DOCUMENT_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `Payload Too Large: File size is ${buffer.length} bytes, which exceeds the strict 40 KB limit (${MAX_DOCUMENT_SIZE_BYTES} bytes).`,
        },
        { status: 413 }
      );
    }

    await connectDB();
    const guest = await Guest.findById(guestId);
    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    if (!hasHotelAccess(user, guest.hotelId.toString())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if a document of this kind already exists for this guest
    let doc = await GuestDocument.findOne({ guestId: guest._id, kind });
    if (doc) {
      doc.data = buffer;
      doc.contentType = contentType;
      doc.sizeBytes = buffer.length;
      await doc.save();
    } else {
      doc = await GuestDocument.create({
        guestId: guest._id,
        hotelId: guest.hotelId,
        kind,
        contentType,
        data: buffer,
        sizeBytes: buffer.length,
      });
    }

    return NextResponse.json({
      success: true,
      documentId: doc._id,
      kind: doc.kind,
      sizeBytes: doc.sizeBytes,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
