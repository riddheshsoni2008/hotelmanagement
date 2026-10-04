import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GuestDocument, MAX_DOCUMENT_SIZE_BYTES } from '@/models/GuestDocument';
import { getCurrentUser, hasHotelAccess } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    await connectDB();
    const doc = await GuestDocument.findById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check hotel authorization
    if (!hasHotelAccess(user, doc.hotelId.toString())) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view documents for this hotel' },
        { status: 403 }
      );
    }

    // Return image binary buffer directly
    const buffer = Buffer.from(doc.data);
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': doc.contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=86400, no-transform',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    const doc = await GuestDocument.findById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!hasHotelAccess(user, doc.hotelId.toString())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await GuestDocument.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { dataBase64, contentType } = body;

    if (!dataBase64 || !contentType) {
      return NextResponse.json({ error: 'dataBase64 and contentType are required' }, { status: 400 });
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
    const doc = await GuestDocument.findById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!hasHotelAccess(user, doc.hotelId.toString())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    doc.data = buffer;
    doc.contentType = contentType;
    doc.sizeBytes = buffer.length;
    await doc.save();

    return NextResponse.json({
      success: true,
      message: 'Document replaced successfully',
      sizeBytes: buffer.length,
    });
  } catch (error) {
    console.error('Error replacing document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
