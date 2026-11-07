import { NextRequest, NextResponse } from 'next/server';
import { assignLeads, unassignLeads, autoDistributeLeads } from '@/lib/db';
import { getUserByUsername, getAllUsers, getSessionUser } from '@/lib/users';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { mode, leadIds, username, callerUsernames, unassignedOnly, category } = body;

    // 1. Auto-distribute equally among selected callers
    if (mode === 'auto-distribute') {
      const allUsers = await getAllUsers();
      let targetCallers = allUsers.filter(u => u.role === 'caller' && u.active);

      // If specific callers provided, filter to them
      if (Array.isArray(callerUsernames) && callerUsernames.length > 0) {
        targetCallers = targetCallers.filter(u => callerUsernames.includes(u.username));
      }

      if (targetCallers.length === 0) {
        return NextResponse.json({ success: false, error: 'No active callers available for distribution' }, { status: 400 });
      }

      const res = await autoDistributeLeads(
        targetCallers.map(c => ({ username: c.username, name: c.name })),
        { unassignedOnly: unassignedOnly !== false, category }
      );

      return NextResponse.json({
        success: true,
        message: `Successfully distributed ${res.distributedCount} leads equally among ${targetCallers.length} sales callers!`,
        distributedCount: res.distributedCount,
        perCallerCount: res.perCallerCount
      });
    }

    // 2. Unassign leads
    if (mode === 'unassign') {
      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return NextResponse.json({ success: false, error: 'No lead IDs provided to unassign' }, { status: 400 });
      }

      const res = await unassignLeads(leadIds);
      return NextResponse.json({
        success: true,
        message: `Successfully unassigned ${res.updatedCount} leads`,
        unassignedCount: res.updatedCount
      });
    }

    // 3. Assign single or bulk to specific caller
    if (!username) {
      return NextResponse.json({ success: false, error: 'Target caller username is required' }, { status: 400 });
    }

    const targetUser = await getUserByUsername(username);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: `Caller "${username}" does not exist` }, { status: 404 });
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No lead IDs provided for assignment' }, { status: 400 });
    }

    const res = await assignLeads(leadIds, targetUser.username, targetUser.name);
    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${res.updatedCount} leads to ${targetUser.name} (${targetUser.username})`,
      assignedCount: res.updatedCount
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
