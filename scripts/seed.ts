import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import zlib from 'zlib';
import { subHours, subDays, addHours, addDays } from 'date-fns';
import fs from 'fs';
import path from 'path';

// Automatically load .env.local or .env if process.env.MONGODB_URI is not set
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

// Pure Node.js valid PNG card generator
function generateMockCardPng(width: number, height: number, isBack = false, seed = 1): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const content = Buffer.concat([typeBuf, data]);
    const crc = zlib.crc32(content);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, content, crcBuf]);
  }

  const scanlines: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // filter
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 3;
      // Tricolor top (saffron)
      if (y < 22) {
        row[idx] = 255;
        row[idx + 1] = 153;
        row[idx + 2] = 51;
      }
      // Tricolor bottom (green)
      else if (y > height - 20) {
        row[idx] = 19;
        row[idx + 1] = 136;
        row[idx + 2] = 8;
      }
      // Card body
      else {
        if (!isBack) {
          // Front: photo box on left side
          if (x >= 25 && x <= 95 && y >= 35 && y <= 115) {
            // Photo silhouette tint based on seed
            const shade = 100 + ((x * y + seed * 17) % 60);
            row[idx] = shade;
            row[idx + 1] = shade + 15;
            row[idx + 2] = shade + 35;
          }
          // Emblem center top
          else if (x >= 140 && x <= 160 && y >= 25 && y <= 45) {
            row[idx] = 30;
            row[idx + 1] = 58;
            row[idx + 2] = 138; // Navy blue emblem
          }
          // Aadhaar text lines placeholder
          else if (
            x >= 110 &&
            x <= width - 30 &&
            ((y >= 50 && y <= 54) || (y >= 65 && y <= 69) || (y >= 80 && y <= 84) || (y >= 100 && y <= 106))
          ) {
            row[idx] = 60;
            row[idx + 1] = 70;
            row[idx + 2] = 90;
          } else {
            // Light background
            row[idx] = 248;
            row[idx + 1] = 250;
            row[idx + 2] = 252;
          }
        } else {
          // Back: Barcode / QR box on right side and address lines
          if (x >= width - 90 && x <= width - 30 && y >= 35 && y <= 95) {
            const isBar = (x % 6 === 0 || y % 7 === 0);
            row[idx] = isBar ? 40 : 230;
            row[idx + 1] = isBar ? 40 : 230;
            row[idx + 2] = isBar ? 40 : 230;
          } else if (
            x >= 30 &&
            x <= width - 110 &&
            ((y >= 40 && y <= 44) ||
              (y >= 55 && y <= 59) ||
              (y >= 70 && y <= 74) ||
              (y >= 85 && y <= 89) ||
              (y >= 100 && y <= 104))
          ) {
            row[idx] = 70;
            row[idx + 1] = 80;
            row[idx + 2] = 95;
          } else {
            row[idx] = 248;
            row[idx + 1] = 250;
            row[idx + 2] = 252;
          }
        }
      }
    }
    scanlines.push(row);
  }

  const rawData = Buffer.concat(scanlines);
  const compressed = zlib.deflateSync(rawData);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB successfully.');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  // Clear existing collections
  console.log('Clearing old collections...');
  const collections = ['users', 'hotels', 'rooms', 'guests', 'guestdocuments', 'stays'];
  for (const c of collections) {
    try {
      await db.collection(c).drop();
    } catch {
      // Collection may not exist yet
    }
  }

  console.log('Creating demo Hotels...');
  const hotelsData = [
    {
      name: 'Heritage Palace Guest House',
      city: 'Jaipur',
      address: 'Plot 42, Civil Lines, Near Railway Station',
      phone: '+91 141 2345678',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Silicon Grand Residency',
      city: 'Bangalore',
      address: '88, 100 Feet Road, Indiranagar',
      phone: '+91 80 41239876',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Coastal Breeze Comfort',
      city: 'Mumbai',
      address: '15 Juhu Tara Road, Juhu',
      phone: '+91 22 26189900',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const hotelInserts = await db.collection('hotels').insertMany(hotelsData);
  const hotelIds = Object.values(hotelInserts.insertedIds);
  const [jaipurId, bangaloreId, mumbaiId] = hotelIds;

  console.log('Creating Owner and Staff Users...');
  const defaultPasswordHash = await bcrypt.hash('Demo@1234', 10);

  const usersData = [
    {
      name: 'Rajesh Singhania (Owner)',
      email: 'owner@demo.com',
      passwordHash: defaultPasswordHash,
      role: 'owner',
      hotelIds: [jaipurId, bangaloreId, mumbaiId],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Manish Verma (Receptionist)',
      email: 'staff@demo.com',
      passwordHash: defaultPasswordHash,
      role: 'staff',
      hotelIds: [jaipurId, bangaloreId],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const userInserts = await db.collection('users').insertMany(usersData);
  const [ownerUserId, staffUserId] = Object.values(userInserts.insertedIds);

  console.log('Creating Rooms across 3 hotels (8-10 rooms each)...');
  const roomTypes = ['Single', 'Double', 'Deluxe', 'Suite', 'Family'] as const;
  const roomsToInsert: Array<Record<string, unknown>> = [];

  const hotelConfigs = [
    { id: jaipurId, prefix: '1', count: 9 },
    { id: bangaloreId, prefix: '2', count: 9 },
    { id: mumbaiId, prefix: '3', count: 8 },
  ];

  for (const cfg of hotelConfigs) {
    for (let i = 1; i <= cfg.count; i++) {
      const roomNum = `${cfg.prefix}0${i}`;
      const type = roomTypes[(i - 1) % roomTypes.length];
      const floor = `${cfg.prefix}st Floor`;
      const pricePerDay = type === 'Single' ? 1200 : type === 'Double' ? 1800 : type === 'Deluxe' ? 2600 : type === 'Suite' ? 3800 : 3200;

      roomsToInsert.push({
        hotelId: cfg.id,
        roomNumber: roomNum,
        type,
        status: 'available', // will update occupied ones when attaching stays
        floor,
        pricePerDay,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  const roomInserts = await db.collection('rooms').insertMany(roomsToInsert);
  const createdRooms = await db.collection('rooms').find().toArray();

  console.log(`Created ${createdRooms.length} rooms.`);

  console.log('Creating realistic Indian guests and Aadhaar documents...');
  const guestProfiles = [
    { name: 'Rahul Sharma', phone: '9876543210', city: 'Delhi', last4: '4192', guests: 2 },
    { name: 'Priya Patel', phone: '9823456781', city: 'Ahmedabad', last4: '8834', guests: 1 },
    { name: 'Amit Verma', phone: '9711223344', city: 'Lucknow', last4: '1092', guests: 3 },
    { name: 'Vikram Malhotra', phone: '9899001122', city: 'Chandigarh', last4: '7721', guests: 2 },
    { name: 'Ananya Joshi', phone: '9845012345', city: 'Pune', last4: '5561', guests: 1 },
    { name: 'Suresh Reddy', phone: '9988776655', city: 'Hyderabad', last4: '3490', guests: 4 },
    { name: 'Neha Gupta', phone: '9810987654', city: 'Noida', last4: '2289', guests: 2 },
    { name: 'Rajesh Nair', phone: '9744556677', city: 'Kochi', last4: '6143', guests: 1 },
    { name: 'Pooja Mehra', phone: '9833221100', city: 'Indore', last4: '9012', guests: 2 },
    { name: 'Rohan Kapoor', phone: '9811335577', city: 'Gurugram', last4: '1244', guests: 3 },
    { name: 'Sunita Rao', phone: '9844221199', city: 'Mysore', last4: '4478', guests: 2 },
    { name: 'Deepak Mehta', phone: '9820112233', city: 'Surat', last4: '6890', guests: 1 },
    { name: 'Kavita Singh', phone: '9911442233', city: 'Bhopal', last4: '3312', guests: 2 },
    { name: 'Arvind Kumar', phone: '9818887766', city: 'Patna', last4: '7754', guests: 2 },
    { name: 'Sanjay Deshmukh', phone: '9867554433', city: 'Nagpur', last4: '8901', guests: 1 },
  ];

  const now = new Date();

  // Create Guest Documents and Stays in different states:
  // 1. Stays in Jaipur:
  //    - Guest 0: Checked-in active (2 hours booked, 1h left)
  //    - Guest 1: Overstay (checked in 4 hours ago for 2 hours -> overdue by 2h)
  //    - Guest 2: Checked-out (completed stay earlier today)
  //    - Guest 3: Checked-out (completed stay yesterday)
  //    - Guest 4: Checked-in active (1 day stay)
  // 2. Stays in Bangalore:
  //    - Guest 5: Checked-in active (6 hours booked)
  //    - Guest 6: Overstay (1 day booked yesterday, expired 2 hours ago)
  //    - Guest 7: Checked-out (completed stay 2 days ago)
  //    - Guest 8: Checked-out (completed stay 3 days ago)
  //    - Guest 9: Checked-in active (12 hours booked)
  // 3. Stays in Mumbai:
  //    - Guest 10: Checked-in active (3 hours booked)
  //    - Guest 11: Checked-out (completed stay yesterday)
  //    - Guest 12: Checked-out (completed stay 4 days ago)
  //    - Guest 13: Checked-in active (2 days booked)
  //    - Guest 14: Checked-out (returning guest from Jaipur stay)

  const stayScenarios = [
    // JAIPUR (hotel 0)
    {
      guestIdx: 0,
      hotelId: jaipurId,
      roomIdx: 0, // 101
      state: 'checked_in',
      checkInAt: subHours(now, 1),
      durationValue: 2,
      durationUnit: 'hours' as const,
      expectedCheckOutAt: addHours(subHours(now, 1), 2), // 1 hour left
      amount: 800,
      paymentMode: 'upi' as const,
      notes: 'Guest requested late checkout if needed.',
    },
    {
      guestIdx: 1,
      hotelId: jaipurId,
      roomIdx: 1, // 102
      state: 'checked_in', // OVERSTAY!
      checkInAt: subHours(now, 4),
      durationValue: 2,
      durationUnit: 'hours' as const,
      expectedCheckOutAt: subHours(now, 2), // overdue by 2 hours!
      amount: 600,
      paymentMode: 'cash' as const,
      notes: 'Contacted room, intercom busy.',
    },
    {
      guestIdx: 2,
      hotelId: jaipurId,
      roomIdx: 2, // 103
      state: 'checked_out',
      checkInAt: subHours(now, 8),
      durationValue: 4,
      durationUnit: 'hours' as const,
      expectedCheckOutAt: subHours(now, 4),
      actualCheckOutAt: subHours(now, 4),
      amount: 1200,
      paymentMode: 'card' as const,
      notes: 'Corporate transit guest.',
    },
    {
      guestIdx: 3,
      hotelId: jaipurId,
      roomIdx: 3, // 104
      state: 'checked_out',
      checkInAt: subDays(now, 1),
      durationValue: 1,
      durationUnit: 'days' as const,
      expectedCheckOutAt: now,
      actualCheckOutAt: subHours(now, 2),
      amount: 1800,
      paymentMode: 'upi' as const,
      notes: 'Luggage stored in cloakroom.',
    },
    {
      guestIdx: 4,
      hotelId: jaipurId,
      roomIdx: 4, // 105
      state: 'checked_in',
      checkInAt: subHours(now, 3),
      durationValue: 1,
      durationUnit: 'days' as const,
      expectedCheckOutAt: addHours(subHours(now, 3), 24),
      amount: 2600,
      paymentMode: 'card' as const,
      notes: 'Deluxe room, extra pillows provided.',
    },

    // BANGALORE (hotel 1)
    {
      guestIdx: 5,
      hotelId: bangaloreId,
      roomIdx: 9, // 201
      state: 'checked_in',
      checkInAt: subHours(now, 2),
      durationValue: 6,
      durationUnit: 'hours' as const,
      expectedCheckOutAt: addHours(subHours(now, 2), 6),
      amount: 1500,
      paymentMode: 'upi' as const,
      notes: 'Family transit visit.',
    },
    {
      guestIdx: 6,
      hotelId: bangaloreId,
      roomIdx: 10, // 202
      state: 'checked_in', // OVERSTAY!
      checkInAt: subHours(now, 14),
      durationValue: 12,
      durationUnit: 'hours' as const,
      expectedCheckOutAt: subHours(now, 2), // Overdue by 2 hours!
      amount: 2200,
      paymentMode: 'cash' as const,
      notes: 'Flight delayed, will extend.',
    },
    {
      guestIdx: 7,
      hotelId: bangaloreId,
      roomIdx: 11, // 203
      state: 'checked_out',
      checkInAt: subDays(now, 2),
      durationValue: 1,
      durationUnit: 'days' as const,
      expectedCheckOutAt: subDays(now, 1),
      actualCheckOutAt: subDays(now, 1),
      amount: 2400,
      paymentMode: 'upi' as const,
      notes: 'Tech conference attendee.',
    },
    {
      guestIdx: 8,
      hotelId: bangaloreId,
      roomIdx: 12, // 204
      state: 'checked_out',
      checkInAt: subDays(now, 3),
      durationValue: 2,
      durationUnit: 'days' as const,
      expectedCheckOutAt: subDays(now, 1),
      actualCheckOutAt: subDays(now, 1),
      amount: 4800,
      paymentMode: 'card' as const,
      notes: 'Early morning express checkout.',
    },
    {
      guestIdx: 9,
      hotelId: bangaloreId,
      roomIdx: 13, // 205
      state: 'checked_in',
      checkInAt: subHours(now, 1),
      durationValue: 12,
      durationUnit: 'hours' as const,
      expectedCheckOutAt: addHours(subHours(now, 1), 12),
      amount: 1800,
      paymentMode: 'upi' as const,
      notes: 'Day pass booking.',
    },

    // MUMBAI (hotel 2)
    {
      guestIdx: 10,
      hotelId: mumbaiId,
      roomIdx: 18, // 301
      state: 'checked_in',
      checkInAt: subHours(now, 1),
      durationValue: 3,
      durationUnit: 'hours' as const,
      expectedCheckOutAt: addHours(subHours(now, 1), 3),
      amount: 1100,
      paymentMode: 'cash' as const,
      notes: 'Short business stopover.',
    },
    {
      guestIdx: 11,
      hotelId: mumbaiId,
      roomIdx: 19, // 302
      state: 'checked_out',
      checkInAt: subDays(now, 1),
      durationValue: 1,
      durationUnit: 'days' as const,
      expectedCheckOutAt: now,
      actualCheckOutAt: subHours(now, 3),
      amount: 3200,
      paymentMode: 'upi' as const,
      notes: 'Invoice sent via WhatsApp.',
    },
    {
      guestIdx: 12,
      hotelId: mumbaiId,
      roomIdx: 20, // 303
      state: 'checked_out',
      checkInAt: subDays(now, 4),
      durationValue: 2,
      durationUnit: 'days' as const,
      expectedCheckOutAt: subDays(now, 2),
      actualCheckOutAt: subDays(now, 2),
      amount: 6400,
      paymentMode: 'card' as const,
      notes: 'Wedding guest group.',
    },
    {
      guestIdx: 13,
      hotelId: mumbaiId,
      roomIdx: 21, // 304
      state: 'checked_in',
      checkInAt: subHours(now, 5),
      durationValue: 2,
      durationUnit: 'days' as const,
      expectedCheckOutAt: addDays(subHours(now, 5), 2),
      amount: 7200,
      paymentMode: 'upi' as const,
      notes: 'Sea view room requested.',
    },
    {
      guestIdx: 14,
      hotelId: mumbaiId,
      roomIdx: 22, // 305
      state: 'checked_out',
      checkInAt: subDays(now, 5),
      durationValue: 1,
      durationUnit: 'days' as const,
      expectedCheckOutAt: subDays(now, 4),
      actualCheckOutAt: subDays(now, 4),
      amount: 3500,
      paymentMode: 'cash' as const,
      notes: 'Repeat guest.',
    },
  ];

  for (let i = 0; i < stayScenarios.length; i++) {
    const sc = stayScenarios[i];
    const profile = guestProfiles[sc.guestIdx];
    const room = createdRooms[sc.roomIdx];

    // Create Guest
    const guestDoc = {
      hotelId: sc.hotelId,
      fullName: profile.name,
      phone: profile.phone,
      email: `${profile.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      address: `House No. ${12 + i * 3}, Sector ${4 + (i % 8)}, Near City Center`,
      city: profile.city,
      idType: 'Aadhaar',
      idLast4: profile.last4,
      numberOfGuests: profile.guests,
      notes: `Verified Aadhaar card ending in ${profile.last4}`,
      createdBy: ownerUserId,
      createdAt: sc.checkInAt,
      updatedAt: sc.checkInAt,
    };

    const insertedGuest = await db.collection('guests').insertOne(guestDoc);
    const guestId = insertedGuest.insertedId;

    // Create Mock Aadhaar Documents (Front and Back, strictly < 40KB)
    const frontPng = generateMockCardPng(280, 160, false, i + 1);
    const backPng = generateMockCardPng(280, 160, true, i + 1);

    if (frontPng.length > 40960 || backPng.length > 40960) {
      throw new Error(`Generated image exceeds 40KB! Front: ${frontPng.length}, Back: ${backPng.length}`);
    }

    await db.collection('guestdocuments').insertMany([
      {
        guestId,
        hotelId: sc.hotelId,
        kind: 'aadhaar_front',
        contentType: 'image/png',
        data: frontPng,
        sizeBytes: frontPng.length,
        createdAt: sc.checkInAt,
        updatedAt: sc.checkInAt,
      },
      {
        guestId,
        hotelId: sc.hotelId,
        kind: 'aadhaar_back',
        contentType: 'image/png',
        data: backPng,
        sizeBytes: backPng.length,
        createdAt: sc.checkInAt,
        updatedAt: sc.checkInAt,
      },
    ]);

    // Create Stay
    await db.collection('stays').insertOne({
      hotelId: sc.hotelId,
      guestId,
      roomId: room._id,
      checkInAt: sc.checkInAt,
      durationValue: sc.durationValue,
      durationUnit: sc.durationUnit,
      expectedCheckOutAt: sc.expectedCheckOutAt,
      actualCheckOutAt: sc.actualCheckOutAt || undefined,
      status: sc.state,
      amount: sc.amount,
      paymentMode: sc.paymentMode,
      notes: sc.notes,
      createdBy: ownerUserId,
      createdAt: sc.checkInAt,
      updatedAt: sc.actualCheckOutAt || sc.checkInAt,
    });

    // If checked_in, mark the room occupied
    if (sc.state === 'checked_in') {
      await db.collection('rooms').updateOne(
        { _id: room._id },
        { $set: { status: 'occupied' } }
      );
    }
  }

  // Ensure unique indexes on collections
  console.log('Ensuring database indexes...');
  await db.collection('rooms').createIndex({ hotelId: 1, roomNumber: 1 }, { unique: true });
  await db.collection('stays').createIndex({ hotelId: 1, status: 1, expectedCheckOutAt: 1 });
  await db.collection('stays').createIndex({ hotelId: 1, checkInAt: -1 });
  await db.collection('guests').createIndex({ hotelId: 1, phone: 1 });
  await db.collection('guestdocuments').createIndex({ guestId: 1, kind: 1 });

  console.log('\n=============================================');
  console.log(' SEEDING COMPLETED SUCCESSFULLY! 🎉');
  console.log('=============================================');
  console.log('Demo Credentials:');
  console.log('  Owner: owner@demo.com / Demo@1234  (All 3 hotels)');
  console.log('  Staff: staff@demo.com / Demo@1234  (Jaipur & Bangalore)');
  console.log('Hotels Seeded: 3');
  console.log('Rooms Seeded: 26 (with occupied, available statuses)');
  console.log('Guests & Stays Seeded: 15 (Active, Overstay, Completed)');
  console.log('Aadhaar Cards Seeded: 30 generated PNGs (< 40KB each)');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
