import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Load .env.local if MONGODB_URI is not set
if (!process.env.MONGODB_URI && typeof process.loadEnvFile === 'function') {
  const envLocal = path.resolve(process.cwd(), '.env.local');
  const envDefault = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envLocal)) {
    process.loadEnvFile(envLocal);
  } else if (fs.existsSync(envDefault)) {
    process.loadEnvFile(envDefault);
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_management';

async function clean() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB successfully.');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  console.log('Clearing all collections (stays, guests, guestdocuments, rooms, hotels, users)...');
  const collections = ['stays', 'guests', 'guestdocuments', 'rooms', 'hotels', 'users'];
  for (const c of collections) {
    try {
      await db.collection(c).deleteMany({});
      console.log(`  ✓ Cleared ${c}`);
    } catch {
      // Collection may not exist yet
    }
  }

  console.log('Ensuring clean database indexes...');
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('rooms').createIndex({ hotelId: 1, roomNumber: 1 }, { unique: true });
    await db.collection('stays').createIndex({ hotelId: 1, status: 1, expectedCheckOutAt: 1 });
    await db.collection('stays').createIndex({ hotelId: 1, checkInAt: -1 });
    await db.collection('guests').createIndex({ hotelId: 1, phone: 1 });
    await db.collection('guestdocuments').createIndex({ guestId: 1, kind: 1 });
    console.log('  ✓ Indexes verified');
  } catch (err) {
    console.warn('  Index creation notice:', err);
  }

  console.log('\n=============================================');
  console.log(' DATABASE FULLY CLEANED! ✨');
  console.log(' All demo data has been wiped.');
  console.log(' The system is ready for the real owner to register & launch.');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

clean().catch((err) => {
  console.error('Clean script error:', err);
  process.exit(1);
});
