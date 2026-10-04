import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { staffSchema } from '@/lib/validations';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Owner only' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parse = staffSchema.partial().safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message }, { status: 400 });
    }

    await connectDB();
    const target = await User.findById(id);
    if (!target) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (parse.data.name) target.name = parse.data.name;
    if (parse.data.email) target.email = parse.data.email;
    if (parse.data.role) target.role = parse.data.role;
    if (parse.data.hotelIds) target.hotelIds = parse.data.hotelIds as unknown as import('mongoose').Types.ObjectId[];
    if (parse.data.isActive !== undefined) target.isActive = parse.data.isActive;

    if (parse.data.password) {
      target.passwordHash = await bcrypt.hash(parse.data.password, 10);
    }

    await target.save();
    return NextResponse.json({ success: true, message: 'Staff member updated successfully' });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Owner only' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self deletion
    if (id === user.userId) {
      return NextResponse.json({ error: 'Cannot delete your own owner account' }, { status: 400 });
    }

    await connectDB();
    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
