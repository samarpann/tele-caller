import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'xlsx';
    const leadsRes = await getAllLeads({ limit: 10000 });
    const leads = leadsRes.leads;

    const rows = leads.map(l => ({
      "Lead ID": l.leadId,
      "Business Name": l.businessName,
      "Category": l.category,
      "Jewelry Specialty": l.jewelrySpecialty || "",
      "Current Software": l.currentSoftware || "",
      "Workshop Status": l.workshopStatus || "",
      "Target Segment": l.targetSegment || "",
      "Contact Person": l.contactPerson,
      "Phone": l.phone,
      "City": l.city,
      "Address": l.address,
      "Landmark": l.landmark || "",
      "Est. Year": l.estYear || "",
      "Turnover": l.turnover || "",
      "Team Size": l.teamSize || "",
      "Facility Area": l.facilityArea || "",
      "Products": l.products,
      "Target Buyers": l.targetBuyers || "",
      "About Company": l.companyBio || "",
      "Call Status": l.status || "Pending",
      "Assigned Caller": l.assignedToName || "Unassigned",
      "Caller Username": l.assignedTo || "",
      "Call Notes": l.notes || "",
      "Callback Scheduled": l.callbackTime || "",
      "Last Updated": l.updatedAt || "",
      "Ice Breaker": l.iceBreaker || "",
      "Pitch Angle": l.pitchAngle
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Telecaller_Report");

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Swastik_Telecaller_Report_${dateStr}.csv"`
        }
      });
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Swastik_Telecaller_Report_${dateStr}.xlsx"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
