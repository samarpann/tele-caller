import fs from 'fs';
import path from 'path';
import { connectToDatabase } from './mongodb';
import { INITIAL_LEADS, Lead } from './initial-leads';

export type { Lead };

export interface PaginationResult<T> {
  leads: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export async function getAllLeads(filters?: {
  status?: string;
  category?: string;
  search?: string;
  assignedTo?: string; // specific username, 'unassigned', or 'all'
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<PaginationResult<Lead>> {
  const page = Math.max(1, Number(filters?.page) || 1);
  const limit = Math.max(1, Math.min(1000, Number(filters?.limit) || 20));
  const skip = (page - 1) * limit;

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('leads');

    // Build Mongo query filter
    const query: any = {};

    // 1. Assigned to filter
    if (filters?.assignedTo && filters.assignedTo !== 'all') {
      if (filters.assignedTo === 'unassigned') {
        query.$or = [
          { assignedTo: { $exists: false } },
          { assignedTo: null },
          { assignedTo: '' }
        ];
      } else {
        query.assignedTo = { $regex: new RegExp(`^${filters.assignedTo}$`, 'i') };
      }
    }

    // 2. Status filter
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'Pending') {
        const pendingCondition = [
          { status: 'Pending' },
          { status: { $exists: false } },
          { status: null },
          { status: '' }
        ];
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: pendingCondition }];
          delete query.$or;
        } else {
          query.$or = pendingCondition;
        }
      } else {
        query.status = filters.status;
      }
    }

    // 3. Category filter
    if (filters?.category && filters.category !== 'all') {
      query.category = { $regex: new RegExp(filters.category, 'i') };
    }

    // 4. Server-side Search filter
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      const regex = { $regex: q, $options: 'i' };
      const searchConditions = [
        { businessName: regex },
        { contactPerson: regex },
        { phone: regex },
        { city: regex },
        { landmark: regex },
        { leadId: regex },
        { category: regex },
        { products: regex },
        { targetBuyers: regex },
        { companyBio: regex },
        { assignedToName: regex },
        { assignedTo: regex }
      ];

      if (query.$and) {
        query.$and.push({ $or: searchConditions });
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Total matching documents for pagination
    const total = await collection.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;

    // Sort order
    const sortField = filters?.sortBy || 'updatedAt';
    const sortDir = filters?.sortOrder === 'asc' ? 1 : -1;
    const sortObj: any = { [sortField]: sortDir, _id: 1 };

    const docs = await collection
      .find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();

    const leads: Lead[] = docs.map(d => ({
      id: d.id || d.leadId || String(d._id),
      leadId: d.leadId,
      businessName: d.businessName,
      category: d.category,
      products: d.products,
      contactPerson: d.contactPerson,
      phone: d.phone,
      address: d.address,
      city: d.city,
      pincode: d.pincode,
      landmark: d.landmark,
      estYear: d.estYear,
      turnover: d.turnover,
      teamSize: d.teamSize,
      facilityArea: d.facilityArea,
      targetBuyers: d.targetBuyers,
      companyBio: d.companyBio,
      iceBreaker: d.iceBreaker,
      websiteStatus: d.websiteStatus || 'No Website',
      pitchAngle: d.pitchAngle,
      status: d.status || 'Pending',
      notes: d.notes || '',
      callbackTime: d.callbackTime || '',
      assignedTo: d.assignedTo,
      assignedToName: d.assignedToName,
      assignedAt: d.assignedAt,
      updatedAt: d.updatedAt
    }));

    return {
      leads,
      total,
      page,
      limit,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    };
  } catch (err) {
    console.error('Mongo error in getAllLeads, fallback to local file', err);
    return getLocalAllLeads(filters);
  }
}

export async function getLeadById(id: string): Promise<Lead | null> {
  try {
    const { db } = await connectToDatabase();
    const doc = await db.collection('leads').findOne({
      $or: [
        { id: id },
        { leadId: { $regex: new RegExp(`^${id}$`, 'i') } }
      ]
    });
    if (!doc) return null;
    return {
      id: doc.id || doc.leadId || String(doc._id),
      leadId: doc.leadId,
      businessName: doc.businessName,
      category: doc.category,
      products: doc.products,
      contactPerson: doc.contactPerson,
      phone: doc.phone,
      address: doc.address,
      city: doc.city,
      pincode: doc.pincode,
      landmark: doc.landmark,
      estYear: doc.estYear,
      turnover: doc.turnover,
      teamSize: doc.teamSize,
      facilityArea: doc.facilityArea,
      targetBuyers: doc.targetBuyers,
      companyBio: doc.companyBio,
      iceBreaker: doc.iceBreaker,
      websiteStatus: doc.websiteStatus || 'No Website',
      pitchAngle: doc.pitchAngle,
      status: doc.status || 'Pending',
      notes: doc.notes || '',
      callbackTime: doc.callbackTime || '',
      assignedTo: doc.assignedTo,
      assignedToName: doc.assignedToName,
      assignedAt: doc.assignedAt,
      updatedAt: doc.updatedAt
    };
  } catch (err) {
    console.error('Mongo error in getLeadById', err);
    return null;
  }
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  const updatePayload = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  try {
    const { db } = await connectToDatabase();
    await db.collection('leads').updateOne(
      {
        $or: [
          { id: id },
          { leadId: { $regex: new RegExp(`^${id}$`, 'i') } }
        ]
      },
      { $set: updatePayload }
    );
    return await getLeadById(id);
  } catch (err) {
    console.error('Mongo error in updateLead', err);
    return null;
  }
}

export async function assignLeads(
  leadIds: string[],
  username: string,
  callerName: string
): Promise<{ success: boolean; updatedCount: number }> {
  try {
    const { db } = await connectToDatabase();
    const idSet = leadIds.map(id => id.trim());

    const res = await db.collection('leads').updateMany(
      {
        $or: [
          { id: { $in: idSet } },
          { leadId: { $in: idSet } }
        ]
      },
      {
        $set: {
          assignedTo: username,
          assignedToName: callerName,
          assignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    );

    return { success: true, updatedCount: res.modifiedCount };
  } catch (err: any) {
    console.error('Mongo error in assignLeads', err);
    return { success: false, updatedCount: 0 };
  }
}

export async function unassignLeads(leadIds: string[]): Promise<{ success: boolean; updatedCount: number }> {
  try {
    const { db } = await connectToDatabase();
    const idSet = leadIds.map(id => id.trim());

    const res = await db.collection('leads').updateMany(
      {
        $or: [
          { id: { $in: idSet } },
          { leadId: { $in: idSet } }
        ]
      },
      {
        $unset: {
          assignedTo: '',
          assignedToName: '',
          assignedAt: ''
        },
        $set: {
          updatedAt: new Date().toISOString()
        }
      }
    );

    return { success: true, updatedCount: res.modifiedCount };
  } catch (err: any) {
    console.error('Mongo error in unassignLeads', err);
    return { success: false, updatedCount: 0 };
  }
}

export async function autoDistributeLeads(
  callers: { username: string; name: string }[],
  options?: { unassignedOnly?: boolean; category?: string }
): Promise<{ success: boolean; distributedCount: number; perCallerCount: Record<string, number> }> {
  if (!callers || callers.length === 0) {
    return { success: false, distributedCount: 0, perCallerCount: {} };
  }

  const perCallerCount: Record<string, number> = {};
  callers.forEach(c => { perCallerCount[c.username] = 0; });

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('leads');

    const query: any = {};
    if (options?.unassignedOnly !== false) {
      query.$or = [
        { assignedTo: { $exists: false } },
        { assignedTo: null },
        { assignedTo: '' }
      ];
    }
    if (options?.category && options.category !== 'all') {
      query.category = { $regex: new RegExp(options.category, 'i') };
    }

    const unassignedDocs = await collection.find(query).toArray();
    if (unassignedDocs.length === 0) {
      return { success: true, distributedCount: 0, perCallerCount };
    }

    const bulkOps = unassignedDocs.map((doc, idx) => {
      const caller = callers[idx % callers.length];
      perCallerCount[caller.username] = (perCallerCount[caller.username] || 0) + 1;
      return {
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              assignedTo: caller.username,
              assignedToName: caller.name,
              assignedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        }
      };
    });

    await collection.bulkWrite(bulkOps);
    return {
      success: true,
      distributedCount: unassignedDocs.length,
      perCallerCount
    };
  } catch (err) {
    console.error('Mongo error in autoDistributeLeads', err);
    return { success: false, distributedCount: 0, perCallerCount };
  }
}

export async function addLeads(
  newLeads: Partial<Lead>[],
  mode: 'append' | 'replace' = 'append'
): Promise<{ total: number; added: number }> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('leads');

    if (mode === 'replace') {
      await collection.deleteMany({});
    }

    const existingCount = await collection.countDocuments();

    const formatted = newLeads.map((item, idx) => {
      const leadNum = existingCount + idx + 1;
      const lId = String(item.leadId || `LEAD-${leadNum}`);
      return {
        id: String(item.id || lId).toLowerCase().replace(/[^a-z0-9_-]/g, ''),
        leadId: lId,
        businessName: item.businessName || '',
        category: item.category || 'General Manufacturing',
        products: item.products || '',
        contactPerson: item.contactPerson || 'Sir/Madam',
        phone: item.phone || '',
        address: item.address || '',
        city: item.city || 'Delhi NCR',
        pincode: item.pincode || '',
        landmark: item.landmark || '',
        estYear: item.estYear || '',
        turnover: item.turnover || '',
        teamSize: item.teamSize || '',
        facilityArea: item.facilityArea || '',
        targetBuyers: item.targetBuyers || '',
        companyBio: item.companyBio || '',
        iceBreaker: item.iceBreaker || '',
        websiteStatus: item.websiteStatus || 'No Website',
        pitchAngle: item.pitchAngle || 'High-converting digital catalog and website',
        status: item.status || 'Pending',
        notes: item.notes || '',
        callbackTime: item.callbackTime || '',
        assignedTo: item.assignedTo,
        assignedToName: item.assignedToName,
        assignedAt: item.assignedAt,
        updatedAt: new Date().toISOString()
      };
    });

    if (formatted.length > 0) {
      await collection.insertMany(formatted);
    }

    const total = await collection.countDocuments();
    return { total, added: formatted.length };
  } catch (err) {
    console.error('Mongo error in addLeads', err);
    return { total: 0, added: 0 };
  }
}

export async function getStats(assignedTo?: string) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('leads');

    const matchQuery: any = {};
    if (assignedTo && assignedTo !== 'all') {
      matchQuery.assignedTo = { $regex: new RegExp(`^${assignedTo}$`, 'i') };
    }

    const [statusCounts, unassignedCount, totalCount] = await Promise.all([
      collection.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray(),
      collection.countDocuments({
        $or: [
          { assignedTo: { $exists: false } },
          { assignedTo: null },
          { assignedTo: '' }
        ]
      }),
      collection.countDocuments(matchQuery)
    ]);

    let interested = 0;
    let callback = 0;
    let noAnswer = 0;
    let rejected = 0;
    let pending = 0;

    statusCounts.forEach(s => {
      if (s._id === 'Interested') interested = s.count;
      else if (s._id === 'Callback') callback = s.count;
      else if (s._id === 'No Answer') noAnswer = s.count;
      else if (s._id === 'Not Interested') rejected = s.count;
      else pending += s.count;
    });

    const called = interested + callback + noAnswer + rejected;
    const conversionRate = called > 0 ? Math.round((interested / called) * 100) : 0;

    return {
      total: totalCount,
      called,
      pending,
      interested,
      callback,
      noAnswer,
      rejected,
      conversionRate,
      unassigned: unassignedCount
    };
  } catch (err) {
    console.error('Mongo error in getStats', err);
    return {
      total: 0,
      called: 0,
      pending: 0,
      interested: 0,
      callback: 0,
      noAnswer: 0,
      rejected: 0,
      conversionRate: 0,
      unassigned: 0
    };
  }
}

export async function getCallerPerformance(callers: { username: string; name: string }[]) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('leads');

    const agg = await collection.aggregate([
      { $match: { assignedTo: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: { assignedTo: { $toLower: '$assignedTo' }, status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    return callers.map(caller => {
      const uLower = caller.username.toLowerCase();
      let interested = 0;
      let callback = 0;
      let noAnswer = 0;
      let rejected = 0;
      let pending = 0;
      let totalAssigned = 0;

      agg.forEach(row => {
        if (row._id.assignedTo === uLower) {
          totalAssigned += row.count;
          if (row._id.status === 'Interested') interested += row.count;
          else if (row._id.status === 'Callback') callback += row.count;
          else if (row._id.status === 'No Answer') noAnswer += row.count;
          else if (row._id.status === 'Not Interested') rejected += row.count;
          else pending += row.count;
        }
      });

      const called = interested + callback + noAnswer + rejected;
      const conversionRate = called > 0 ? Math.round((interested / called) * 100) : 0;

      return {
        username: caller.username,
        name: caller.name,
        totalAssigned,
        called,
        pending,
        interested,
        callback,
        noAnswer,
        rejected,
        conversionRate
      };
    });
  } catch (err) {
    console.error('Mongo error in getCallerPerformance', err);
    return [];
  }
}

// Fallback for local JSON
function getLocalAllLeads(filters?: any): PaginationResult<Lead> {
  const localPath = path.join(process.cwd(), 'data', 'leads.json');
  let leads: Lead[] = [];
  if (fs.existsSync(localPath)) {
    try { leads = JSON.parse(fs.readFileSync(localPath, 'utf8')); } catch {}
  }
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const total = leads.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paged = leads.slice((page - 1) * limit, page * limit);
  return {
    leads: paged,
    total,
    page,
    limit,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages
  };
}
