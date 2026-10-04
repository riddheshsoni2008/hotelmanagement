import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { signAuthToken, AUTH_COOKIE_NAME } from '@/lib/jwt';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parse = updateProfileSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { name, currentPassword, newPassword } = parse.data;

    await connectDB();
    const user = await User.findById(authUser.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Please enter your current password to set a new password' },
          { status: 400 }
        );
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: 'Incorrect current password' },
          { status: 400 }
        );
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (name) {
      user.name = name;
    }

    await user.save();

    // Re-issue JWT token with updated name
    const newToken = await signAuthToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      hotelIds: (user.hotelIds || []).map((id) => id.toString()),
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating profile' },
      { status: 500 }
    );
  }
}
