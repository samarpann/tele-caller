// Import 100 Salons & Cafes leads into MongoDB Atlas and export to Excel/CSV

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const XLSX = require(path.join(__dirname, 'swastik-telecaller/node_modules/xlsx'));

const uri = 'mongodb+srv://samarpansingh17_db_user:TZCYzijR78tJz3CN@cluster0.yasfylo.mongodb.net/swastik_telecaller?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  const leadsPath = path.join(__dirname, 'salons_and_cafes_100_leads.json');
  const newLeads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));

  console.log(`Read ${newLeads.length} leads from JSON`);

  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected to MongoDB Atlas');

  const db = client.db('swastik_telecaller');
  const collection = db.collection('leads');

  // Insert or upsert by leadId
  const operations = newLeads.map(l => ({
    updateOne: {
      filter: { leadId: l.leadId },
      update: { $set: l },
      upsert: true
    }
  }));

  const res = await collection.bulkWrite(operations);
  console.log('Bulk write result:', {
    matched: res.matchedCount,
    modified: res.modifiedCount,
    upserted: res.upsertedCount
  });

  const totalCount = await collection.countDocuments();
  console.log(`Total leads in Atlas now: ${totalCount}`);

  // Also export these 100 leads to Excel and CSV in Downloads
  const excelRows = newLeads.map((l, i) => ({
    'S.No': i + 1,
    'Lead ID': l.leadId,
    'Business / Brand Name': l.businessName,
    'Category': l.category,
    'Specialty / Key Offerings': l.products,
    'Owner / Manager': l.contactPerson,
    'Phone': l.phone,
    'Address': l.address,
    'City': l.city,
    'Pincode': l.pincode,
    'Prominent Landmark': l.landmark,
    'Est. Year': l.estYear,
    'Annual Turnover': l.turnover,
    'Team / Staff Size': l.teamSize,
    'Facility / Seating Area': l.facilityArea,
    'Target Clientele / Footfall': l.targetBuyers,
    'Company Story / Bio': l.companyBio,
    'Telecaller Opener / Ice-Breaker': l.iceBreaker,
    'Website Status': l.websiteStatus,
    'Pitch Angle / Offer': l.pitchAngle,
    'Calling Status': l.status,
    'Assigned Caller': l.assignedToName || l.assignedTo
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Salons & Cafes 100');

  const excelPath = '/Users/samarpan/Downloads/Delhi_NCR_Top_100_Salons_and_Cafes_Leads.xlsx';
  const csvPath = '/Users/samarpan/Downloads/Delhi_NCR_Top_100_Salons_and_Cafes_Leads.csv';

  XLSX.writeFile(wb, excelPath);
  console.log(`Exported Excel to ${excelPath}`);

  const csvContent = XLSX.utils.sheet_to_csv(ws);
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`Exported CSV to ${csvPath}`);

  // Also export complete 300 leads dataset
  const allDocs = await collection.find({}).sort({ leadId: 1 }).toArray();
  const allExcelRows = allDocs.map((l, i) => ({
    'S.No': i + 1,
    'Lead ID': l.leadId,
    'Business / Brand Name': l.businessName,
    'Category': l.category,
    'Products / Specialties': l.products,
    'Contact Person': l.contactPerson,
    'Phone': l.phone,
    'Address': l.address,
    'City': l.city,
    'Pincode': l.pincode,
    'Landmark': l.landmark,
    'Est. Year': l.estYear,
    'Turnover': l.turnover,
    'Team Size': l.teamSize,
    'Facility Area': l.facilityArea,
    'Target Buyers / Footfall': l.targetBuyers,
    'Company Bio': l.companyBio,
    'Ice-Breaker': l.iceBreaker,
    'Website Status': l.websiteStatus,
    'Pitch Angle': l.pitchAngle,
    'Status': l.status,
    'Assigned Caller': l.assignedToName || l.assignedTo
  }));

  const wbAll = XLSX.utils.book_new();
  const wsAll = XLSX.utils.json_to_sheet(allExcelRows);
  XLSX.utils.book_append_sheet(wbAll, wsAll, 'All 300 Leads');
  const allExcelPath = '/Users/samarpan/Downloads/Delhi_NCR_All_300_Leads_Manufacturing_Salons_Cafes.xlsx';
  XLSX.writeFile(wbAll, allExcelPath);
  console.log(`Exported full 300 dataset to ${allExcelPath}`);

  await client.close();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error in import:', err);
  process.exit(1);
});
