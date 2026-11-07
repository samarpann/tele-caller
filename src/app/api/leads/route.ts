import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, addLeads } from '@/lib/db';
import { getSessionUser } from '@/lib/users';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;

    let assignedTo = searchParams.get('assignedTo') || undefined;

    // Strict Role-Based Access Control:
    // If logged in as a sales caller, they CAN ONLY access leads assigned to their username!
    if (session && session.role === 'caller') {
      assignedTo = session.username;
    }

    const result = await getAllLeads({
      status,
      category,
      search,
      assignedTo,
      page,
      limit,
      sortBy,
      sortOrder
    });

    return NextResponse.json({
      success: true,
      count: result.leads.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasPrev: result.hasPrev,
      hasNext: result.hasNext,
      userRole: session?.role || 'anonymous',
      callerUsername: session?.username,
      leads: result.leads
    });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only Super Admin can import new leads' },
        { status: 403 }
      );
    }

    const contentType = req.headers.get('content-type') || '';

    // Check if multipart form-data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const mode = (formData.get('mode') as 'append' | 'replace') || 'append';

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const wb = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(firstSheet);

      if (!rawRows || rawRows.length === 0) {
        return NextResponse.json({ success: false, error: 'Uploaded file is empty' }, { status: 400 });
      }

      // Map common headers flexibly
      const formatted = rawRows.map((r, idx) => ({
        leadId: r['Lead ID'] || r['LeadID'] || r['ID'] || `LEAD-${idx + 1}`,
        businessName: r['Business Name'] || r['Company'] || r['Business'] || 'Untitled Business',
        category: r['Category / Industry'] || r['Category'] || r['Industry'] || 'Manufacturing',
        products: r['Products / Specialties'] || r['Products'] || r['Specialties'] || '',
        contactPerson: r['Contact Person / Owner'] || r['Contact Person'] || r['Owner'] || r['Name'] || 'Sir/Madam',
        phone: r['Phone / Mobile'] || r['Phone'] || r['Mobile'] || '',
        address: r['Address'] || r['Location'] || '',
        city: r['City / Hub'] || r['City'] || 'Delhi NCR',
        pincode: r['Pincode'] || r['Pin'] || '',
        landmark: r['Landmark'] || r['Near Landmark'] || '',
        estYear: r['Est. Year'] || r['Est Year'] || r['Year Established'] || '',
        turnover: r['Turnover'] || r['Annual Turnover'] || '',
        teamSize: r['Team Size'] || r['Workforce'] || '',
        facilityArea: r['Facility Area'] || r['Factory Area'] || '',
        targetBuyers: r['Target Buyers / Clientele'] || r['Target Buyers'] || '',
        companyBio: r['About Company / Bio'] || r['About Company'] || r['Bio'] || '',
        iceBreaker: r['Personalized Ice Breaker'] || r['Ice Breaker'] || '',
        websiteStatus: r['Website Status'] || 'No Website',
        pitchAngle: r['Web Design Pitch Angle'] || r['Pitch Angle'] || r['Notes'] || ''
      }));

      const res = await addLeads(formatted, mode);
      return NextResponse.json({
        success: true,
        message: `Successfully processed ${formatted.length} leads!`,
        total: res.total,
        added: res.added
      });
    }

    // Otherwise JSON body
    const body = await req.json();
    const leads = body.leads || (Array.isArray(body) ? body : [body]);
    const mode = body.mode || 'append';

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid leads array' }, { status: 400 });
    }

    const res = await addLeads(leads, mode);
    return NextResponse.json({
      success: true,
      message: `Successfully saved ${res.added} leads to database!`,
      total: res.total,
      added: res.added
    });
  } catch (error: any) {
    console.error('Error processing leads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
