import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete('telecaller_session');
  return response;
}

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', req.url));
  response.cookies.delete('telecaller_session');
  return response;
}
