import { NextRequest, NextResponse } from 'next/server';
import { getStats, getCallerPerformance } from '@/lib/db';
import { getSessionUser, getAllUsers } from '@/lib/users';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const { searchParams } = new URL(req.url);

    let assignedTo = searchParams.get('assignedTo') || undefined;

    // Caller only sees their own stats
    if (session && session.role === 'caller') {
      assignedTo = session.username;
    }

    const stats = await getStats(assignedTo);

    let teamPerformance: any[] = [];
    if (!session || session.role === 'super_admin') {
      const allUsers = await getAllUsers();
      const callers = allUsers.filter(u => u.role === 'caller');
      teamPerformance = await getCallerPerformance(callers.map(c => ({ username: c.username, name: c.name })));
    }

    return NextResponse.json({
      success: true,
      stats,
      teamPerformance
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
