import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, createSessionToken, verifyPassword } from '@/lib/users';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { success: false, error: 'This user account has been deactivated' },
        { status: 403 }
      );
    }

    // Secure bcrypt check with fallback
    const isValid = verifyPassword(password, user);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user: {
        username: user.username,
        name: user.name,
        role: user.role
      }
    });

    // Set secure HTTP cookie
    response.cookies.set({
      name: 'telecaller_session',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
