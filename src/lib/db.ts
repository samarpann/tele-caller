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

// In-memory fallback cache
let inMemoryLeads: Lead[] = [...INITIAL_LEADS];

function getMemoryLeads(): Lead[] {
  const localPath = path.join(process.cwd(), 'data', 'leads.json');
  if (fs.existsSync(localPath)) {
    try {
      const fileLeads = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      if (Array.isArray(fileLeads) && fileLeads.length > 0) {
        return fileLeads;
      }
    } catch {}
  }
  return inMemoryLeads;
}

export async function getAllLeads(filters?: {
  status?: string;
  category?: string;
  hub?: string;
  city?: string;
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

    // 3b. Hub / City filter (e.g. Rajouri Garden, Karol Bagh)
    const hubFilter = filters?.hub || filters?.city;
    if (hubFilter && hubFilter !== 'all') {
      query.city = { $regex: new RegExp(hubFilter, 'i') };
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
        { assignedTo: regex },
        { jewelrySpecialty: regex },
        { currentSoftware: regex },
        { workshopStatus: regex }
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
      updatedAt: d.updatedAt,
      jewelrySpecialty: d.jewelrySpecialty,
      currentSoftware: d.currentSoftware,
      workshopStatus: d.workshopStatus,
      targetSegment: d.targetSegment
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
    console.error('Mongo error in getAllLeads, fallback to local/in-memory leads', err);
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
    if (doc) {
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
        updatedAt: doc.updatedAt,
        jewelrySpecialty: doc.jewelrySpecialty,
        currentSoftware: doc.currentSoftware,
        workshopStatus: doc.workshopStatus,
        targetSegment: doc.targetSegment
      };
    }
  } catch (err) {
    console.error('Mongo error in getLeadById', err);
  }

  const all = getMemoryLeads();
  const clean = id.trim().toLowerCase();
  return all.find(l => l.leadId?.toLowerCase() === clean || l.id?.toLowerCase() === clean) || null;
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
    const updated = await getLeadById(id);
    if (updated) return updated;
  } catch (err) {
    console.error('Mongo error in updateLead', err);
  }

  // Update in-memory
  const idx = inMemoryLeads.findIndex(l => l.leadId?.toLowerCase() === id.toLowerCase() || l.id === id);
  if (idx !== -1) {
    inMemoryLeads[idx] = { ...inMemoryLeads[idx], ...updatePayload };
    return inMemoryLeads[idx];
  }
  return null;
}

export async function assignLeads(
  leadIds: string[],
  username: string,
  callerName: string
): Promise<{ success: boolean; updatedCount: number }> {
  const idSet = new Set(leadIds.map(id => id.trim().toLowerCase()));
  let count = 0;

  try {
    const { db } = await connectToDatabase();
    const res = await db.collection('leads').updateMany(
      {
        $or: [
          { id: { $in: leadIds.map(id => id.trim()) } },
          { leadId: { $in: leadIds.map(id => id.trim()) } }
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
    count = res.modifiedCount;
  } catch (err: any) {
    console.error('Mongo error in assignLeads', err);
  }

  // Also update in-memory
  inMemoryLeads.forEach(l => {
    if (idSet.has(l.leadId.toLowerCase()) || (l.id && idSet.has(l.id.toLowerCase()))) {
      l.assignedTo = username;
      l.assignedToName = callerName;
      l.assignedAt = new Date().toISOString();
      l.updatedAt = new Date().toISOString();
      if (!count) count++;
    }
  });

  return { success: true, updatedCount: count };
}

export async function unassignLeads(leadIds: string[]): Promise<{ success: boolean; updatedCount: number }> {
  const idSet = new Set(leadIds.map(id => id.trim().toLowerCase()));
  let count = 0;

  try {
    const { db } = await connectToDatabase();
    const res = await db.collection('leads').updateMany(
      {
        $or: [
          { id: { $in: leadIds.map(id => id.trim()) } },
          { leadId: { $in: leadIds.map(id => id.trim()) } }
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
    count = res.modifiedCount;
  } catch (err: any) {
    console.error('Mongo error in unassignLeads', err);
  }

  inMemoryLeads.forEach(l => {
    if (idSet.has(l.leadId.toLowerCase()) || (l.id && idSet.has(l.id.toLowerCase()))) {
      delete l.assignedTo;
      delete l.assignedToName;
      delete l.assignedAt;
      l.updatedAt = new Date().toISOString();
      if (!count) count++;
    }
  });

  return { success: true, updatedCount: count };
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
    if (unassignedDocs.length > 0) {
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

      const res = await collection.bulkWrite(bulkOps);
      return {
        success: true,
        distributedCount: res.modifiedCount,
        perCallerCount
      };
    }
  } catch (err) {
    console.error('Mongo error in autoDistributeLeads, falling back to in-memory', err);
  }

  // Fallback in-memory auto-distribution
  let leadsToDist = inMemoryLeads;
  if (options?.unassignedOnly !== false) {
    leadsToDist = leadsToDist.filter(l => !l.assignedTo);
  }
  if (options?.category && options.category !== 'all') {
    leadsToDist = leadsToDist.filter(l => l.category.toLowerCase().includes(options.category!.toLowerCase()));
  }

  leadsToDist.forEach((lead, idx) => {
    const caller = callers[idx % callers.length];
    lead.assignedTo = caller.username;
    lead.assignedToName = caller.name;
    lead.assignedAt = new Date().toISOString();
    lead.updatedAt = new Date().toISOString();
    perCallerCount[caller.username] = (perCallerCount[caller.username] || 0) + 1;
  });

  return {
    success: true,
    distributedCount: leadsToDist.length,
    perCallerCount
  };
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

    const formatted: Lead[] = newLeads.map((item, idx) => {
      const leadId = item.leadId || `LEAD-NEW-${Date.now()}-${idx + 1}`;
      return {
        id: leadId,
        leadId: leadId,
        businessName: item.businessName || 'Unnamed Business',
        category: item.category || 'General',
        products: item.products || '',
        contactPerson: item.contactPerson || 'Business Owner',
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
        pitchAngle: item.pitchAngle || '',
        status: item.status || 'Pending',
        notes: item.notes || '',
        callbackTime: item.callbackTime || '',
        assignedTo: item.assignedTo,
        assignedToName: item.assignedToName,
        assignedAt: item.assignedAt,
        updatedAt: new Date().toISOString(),
        jewelrySpecialty: item.jewelrySpecialty,
        currentSoftware: item.currentSoftware,
        workshopStatus: item.workshopStatus,
        targetSegment: item.targetSegment
      };
    });

    if (formatted.length > 0) {
      await collection.insertMany(formatted as any);
    }

    const total = await collection.countDocuments();
    return { total, added: formatted.length };
  } catch (err) {
    console.error('Mongo error in addLeads', err);
    return { total: inMemoryLeads.length, added: 0 };
  }
}

export async function getStats(assignedTo?: string, category?: string, hub?: string) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('leads');

    const matchQuery: any = {};
    if (assignedTo && assignedTo !== 'all') {
      matchQuery.assignedTo = { $regex: new RegExp(`^${assignedTo}$`, 'i') };
    }
    if (category && category !== 'all') {
      matchQuery.category = { $regex: new RegExp(category, 'i') };
    }
    if (hub && hub !== 'all') {
      matchQuery.city = { $regex: new RegExp(hub, 'i') };
    }

    const unassignedQuery: any = {
      $or: [
        { assignedTo: { $exists: false } },
        { assignedTo: null },
        { assignedTo: '' }
      ]
    };
    if (category && category !== 'all') {
      unassignedQuery.category = { $regex: new RegExp(category, 'i') };
    }
    if (hub && hub !== 'all') {
      unassignedQuery.city = { $regex: new RegExp(hub, 'i') };
    }

    const [statusCounts, unassignedCount, totalCount] = await Promise.all([
      collection.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray(),
      collection.countDocuments(unassignedQuery),
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
      else if (s._id === 'Not Interested' || s._id === 'Rejected') rejected = s.count;
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
    console.error('Mongo error in getStats, fallback to memory', err);
  }

  // Fallback calculation from in-memory/local leads
  let leads = getMemoryLeads();
  if (assignedTo && assignedTo !== 'all') {
    leads = leads.filter(l => l.assignedTo?.toLowerCase() === assignedTo.toLowerCase());
  }
  if (category && category !== 'all') {
    leads = leads.filter(l => l.category?.toLowerCase().includes(category.toLowerCase()));
  }
  if (hub && hub !== 'all') {
    leads = leads.filter(l => l.city?.toLowerCase().includes(hub.toLowerCase()));
  }

  let interested = 0;
  let callback = 0;
  let noAnswer = 0;
  let rejected = 0;
  let pending = 0;
  let unassigned = 0;

  leads.forEach(l => {
    if (!l.assignedTo) unassigned++;
    if (l.status === 'Interested') interested++;
    else if (l.status === 'Callback') callback++;
    else if (l.status === 'No Answer') noAnswer++;
    else if (l.status === 'Not Interested' || l.status === 'Rejected') rejected++;
    else pending++;
  });

  const called = interested + callback + noAnswer + rejected;
  const conversionRate = called > 0 ? Math.round((interested / called) * 100) : 0;

  return {
    total: leads.length,
    called,
    pending,
    interested,
    callback,
    noAnswer,
    rejected,
    conversionRate,
    unassigned
  };
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
          else if (row._id.status === 'Not Interested' || row._id.status === 'Rejected') rejected += row.count;
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
    console.error('Mongo error in getCallerPerformance, fallback to memory', err);
  }

  const allLeads = getMemoryLeads();
  return callers.map(caller => {
    const uLower = caller.username.toLowerCase();
    const callerLeads = allLeads.filter(l => l.assignedTo?.toLowerCase() === uLower);
    let interested = 0;
    let callback = 0;
    let noAnswer = 0;
    let rejected = 0;
    let pending = 0;

    callerLeads.forEach(l => {
      if (l.status === 'Interested') interested++;
      else if (l.status === 'Callback') callback++;
      else if (l.status === 'No Answer') noAnswer++;
      else if (l.status === 'Not Interested' || l.status === 'Rejected') rejected++;
      else pending++;
    });

    const called = interested + callback + noAnswer + rejected;
    const conversionRate = called > 0 ? Math.round((interested / called) * 100) : 0;

    return {
      username: caller.username,
      name: caller.name,
      totalAssigned: callerLeads.length,
      called,
      pending,
      interested,
      callback,
      noAnswer,
      rejected,
      conversionRate
    };
  });
}

// Fallback for local/in-memory leads with complete search, filter, and pagination
function getLocalAllLeads(filters?: any): PaginationResult<Lead> {
  let leads = getMemoryLeads();

  // 1. Filter by assignedTo
  if (filters?.assignedTo && filters.assignedTo !== 'all') {
    if (filters.assignedTo === 'unassigned') {
      leads = leads.filter(l => !l.assignedTo);
    } else {
      const targetCaller = filters.assignedTo.toLowerCase();
      leads = leads.filter(l => l.assignedTo?.toLowerCase() === targetCaller);
    }
  }

  // 2. Filter by status
  if (filters?.status && filters.status !== 'all') {
    if (filters.status === 'Pending') {
      leads = leads.filter(l => !l.status || l.status === 'Pending');
    } else {
      leads = leads.filter(l => l.status === filters.status);
    }
  }

  // 3. Filter by category
  if (filters?.category && filters.category !== 'all') {
    leads = leads.filter(l => l.category?.toLowerCase().includes(filters.category.toLowerCase()));
  }

  // 3b. Filter by hub / city
  const hubFilter = filters?.hub || filters?.city;
  if (hubFilter && hubFilter !== 'all') {
    leads = leads.filter(l => l.city?.toLowerCase().includes(hubFilter.toLowerCase()));
  }

  // 4. Server-side Search filter
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    leads = leads.filter(l =>
      l.businessName?.toLowerCase().includes(q) ||
      l.contactPerson?.toLowerCase().includes(q) ||
      String(l.phone || '').includes(q) ||
      l.city?.toLowerCase().includes(q) ||
      l.landmark?.toLowerCase().includes(q) ||
      l.leadId?.toLowerCase().includes(q) ||
      l.products?.toLowerCase().includes(q) ||
      l.companyBio?.toLowerCase().includes(q) ||
      l.assignedToName?.toLowerCase().includes(q) ||
      l.assignedTo?.toLowerCase().includes(q) ||
      l.jewelrySpecialty?.toLowerCase().includes(q) ||
      l.currentSoftware?.toLowerCase().includes(q) ||
      l.workshopStatus?.toLowerCase().includes(q)
    );
  }

  const total = leads.length;
  const page = Math.max(1, Number(filters?.page) || 1);
  const limit = Math.max(1, Math.min(1000, Number(filters?.limit) || 20));
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
