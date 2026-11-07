import { NextRequest, NextResponse } from 'next/server';
import { updateUser, deleteUser, getSessionUser } from '@/lib/users';
import { getAllLeads, unassignLeads } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const { username } = await params;
    const body = await req.json();

    const res = await updateUser(username, body);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const { username } = await params;
    const res = await deleteUser(username);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    // Also unassign leads previously assigned to this user
    const leadsRes = await getAllLeads({ assignedTo: username, limit: 10000 });
    if (leadsRes.leads && leadsRes.leads.length > 0) {
      await unassignLeads(leadsRes.leads.map(l => l.id));
    }

    return NextResponse.json({
      success: true,
      message: `User ${username} deleted and ${leadsRes.leads.length} leads unassigned.`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
