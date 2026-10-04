import { NextRequest, NextResponse } from 'next/server';
import { subMonths } from 'date-fns';
import { connectDB } from '@/lib/db';
import { Stay } from '@/models/Stay';
import { GuestDocument } from '@/models/GuestDocument';
import { getCurrentUser } from '@/lib/auth';
import { cleanupDocumentsSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Owner only' }, { status: 403 });
    }

    const body = await request.json();
    const parse = cleanupDocumentsSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message }, { status: 400 });
    }

    const { olderThanMonths } = parse.data;
    const cutoffDate = subMonths(new Date(), olderThanMonths);

    await connectDB();

    // Find documents created before cutoffDate
    const oldDocs = await GuestDocument.find({ createdAt: { $lt: cutoffDate } })
      .select('_id sizeBytes')
      .lean();

    if (oldDocs.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No documents found older than ${olderThanMonths} months.`,
        deletedCount: 0,
        bytesFreed: 0,
      });
    }

    const totalBytes = oldDocs.reduce((acc, doc) => acc + (doc.sizeBytes || 0), 0);
    const docIds = oldDocs.map((d) => d._id);

    const result = await GuestDocument.deleteMany({ _id: { $in: docIds } });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} old documents, freeing ${(totalBytes / 1024).toFixed(1)} KB from database.`,
      deletedCount: result.deletedCount,
      bytesFreed: totalBytes,
    });
  } catch (error) {
    console.error('Error cleaning up documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
