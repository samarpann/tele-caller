import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, getSessionUser } from '@/lib/users';
import { getCallerPerformance } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const users = await getAllUsers();
    const callers = users.filter(u => u.role === 'caller' && u.active);
    const performance = await getCallerPerformance(callers.map(c => ({ username: c.username, name: c.name })));

    // Map users with their live performance stats
    const usersWithStats = users.map(u => {
      const perf = performance.find(p => p.username.toLowerCase() === u.username.toLowerCase());
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt,
        password: u.password, // Exposed to super admin so they can manage/view credentials
        stats: perf || {
          totalAssigned: 0,
          called: 0,
          pending: 0,
          interested: 0,
          callback: 0,
          noAnswer: 0,
          rejected: 0,
          conversionRate: 0
        }
      };
    });

    return NextResponse.json({ success: true, count: usersWithStats.length, users: usersWithStats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { username, name, password, role } = body;

    if (!username || !name || !password) {
      return NextResponse.json(
        { success: false, error: 'User ID (username), Name, and Password are all required' },
        { status: 400 }
      );
    }

    const res = await createUser({
      username,
      name,
      password,
      role: role || 'caller'
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${res.user?.name} (${res.user?.username}) created successfully!`,
      user: res.user
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
