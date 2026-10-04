import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Only hotel owners can reset data' }, { status: 403 });
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Clean operational data: stays, guests, guestdocuments
    // Keeps owner user and hotel structure intact, but cleans all fake stays, guests, cards
    const { preserveRooms } = await request.json().catch(() => ({ preserveRooms: true }));

    await db.collection('stays').deleteMany({});
    await db.collection('guests').deleteMany({});
    await db.collection('guestdocuments').deleteMany({});

    if (!preserveRooms) {
      await db.collection('rooms').deleteMany({});
    } else {
      // Set all rooms back to available
      await db.collection('rooms').updateMany({}, { $set: { status: 'available' } });
    }

    return NextResponse.json({
      success: true,
      message: 'All guest stays, documents, and demo records have been cleaned successfully! All rooms are now vacant and ready.',
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json({ error: 'Failed to reset database' }, { status: 500 });
  }
}
