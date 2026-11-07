import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/users';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
