import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { WEST_DELHI_JEWELLERS } from '@/lib/west-delhi-jewellers';
import { getSessionUser } from '@/lib/users';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Super Admin only.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('leads');

    const bulkOps = WEST_DELHI_JEWELLERS.map(l => {
      const {
        assignedTo,
        assignedToName,
        assignedAt,
        status,
        notes,
        callbackTime,
        ...staticFields
      } = l;

      return {
        updateOne: {
          filter: { leadId: l.leadId },
          update: {
            $set: staticFields,
            $setOnInsert: {
              assignedTo: assignedTo || '',
              assignedToName: assignedToName || '',
              assignedAt: assignedAt || new Date().toISOString(),
              status: status || 'Pending',
              notes: notes || '',
              callbackTime: callbackTime || ''
            }
          },
          upsert: true
        }
      };
    });

    const res = await collection.bulkWrite(bulkOps);
    const totalCount = await collection.countDocuments();
    const jewellersCount = await collection.countDocuments({ category: 'West Delhi Jewellers' });

    return NextResponse.json({
      success: true,
      upserted: res.upsertedCount,
      modified: res.modifiedCount,
      matched: res.matchedCount,
      totalCount,
      jewellersCount,
      databaseName: db.databaseName
    });
  } catch (error: any) {
    console.error('Error syncing jewellers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
