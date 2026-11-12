import { NextRequest, NextResponse } from 'next/server';
import { getStats, getCallerPerformance } from '@/lib/db';
import { getSessionUser, getAllUsers } from '@/lib/users';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const { searchParams } = new URL(req.url);

    let assignedTo = searchParams.get('assignedTo') || undefined;
    const category = searchParams.get('category') || undefined;
    const hub = searchParams.get('hub') || undefined;

    // Caller only sees their own stats
    if (session && session.role === 'caller') {
      assignedTo = session.username;
    }

    const stats = await getStats(assignedTo, category, hub);

    let teamPerformance: any[] = [];
    if (!session || session.role === 'super_admin') {
      const allUsers = await getAllUsers();
      const callers = allUsers.filter(u => u.role === 'caller');
      teamPerformance = await getCallerPerformance(callers.map(c => ({ username: c.username, name: c.name })));
    }

    let dbName = 'unknown';
    let totalInDb = 0;
    let uriMasked = '';
    let hosts: any = [];
    try {
      const { connectToDatabase } = await import('@/lib/mongodb');
      const { client, db } = await connectToDatabase();
      dbName = db.databaseName;
      totalInDb = await db.collection('leads').countDocuments();
      uriMasked = (process.env.MONGODB_URI || 'default fallback').replace(/:([^@]+)@/, ':***@');
      hosts = client.options.hosts;
    } catch (e: any) {
      dbName = 'error: ' + e.message;
    }

    return NextResponse.json({
      success: true,
      stats,
      teamPerformance,
      dbInfo: { dbName, totalInDb, uriMasked, hosts }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
