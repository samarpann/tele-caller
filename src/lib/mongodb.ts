import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://samarpansingh17_db_user:TZCYzijR78tJz3CN@cluster0.yasfylo.mongodb.net/swastik_telecaller?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'swastik_telecaller';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let isInitialized = false;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  await client.connect();
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  // Run initialization & indexing once
  if (!isInitialized) {
    isInitialized = true;
    initDatabase(db).catch(err => console.error('Error initializing MongoDB collections:', err));
  }

  return { client, db };
}

async function initDatabase(db: Db) {
  try {
    const leadsCol = db.collection('leads');
    const usersCol = db.collection('users');

    // Create Indexes for fast server-side query and pagination
    try {
      await leadsCol.createIndex({ leadId: 1 }, { unique: true, sparse: true });
      await leadsCol.createIndex({ assignedTo: 1 });
      await leadsCol.createIndex({ status: 1 });
      await leadsCol.createIndex({ category: 1 });
      await leadsCol.createIndex({ updatedAt: -1 });

      // Compound text index for fast search across all key business fields
      await leadsCol.createIndex({
        businessName: 'text',
        contactPerson: 'text',
        phone: 'text',
        city: 'text',
        landmark: 'text',
        products: 'text',
        companyBio: 'text',
        targetBuyers: 'text',
      });

      await usersCol.createIndex({ username: 1 }, { unique: true });
    } catch {
      // Indexes already present in Atlas
    }

    // Check if initial seeding needed from local JSON
    const leadCount = await leadsCol.countDocuments();
    if (leadCount === 0) {
      console.log('Seeding initial leads into MongoDB Atlas...');
      const localLeadsPath = path.join(process.cwd(), 'data', 'leads.json');
      if (fs.existsSync(localLeadsPath)) {
        const localLeads = JSON.parse(fs.readFileSync(localLeadsPath, 'utf8'));
        if (Array.isArray(localLeads) && localLeads.length > 0) {
          await leadsCol.insertMany(localLeads);
          console.log(`✅ Seeded ${localLeads.length} leads into MongoDB Atlas.`);
        }
      }
    }

    const userCount = await usersCol.countDocuments();
    if (userCount === 0) {
      console.log('Seeding initial users with secure password hashes into MongoDB Atlas...');
      const localUsersPath = path.join(process.cwd(), 'data', 'users.json');
      let usersToSeed: any[] = [];

      if (fs.existsSync(localUsersPath)) {
        usersToSeed = JSON.parse(fs.readFileSync(localUsersPath, 'utf8'));
      } else {
        usersToSeed = [
          { id: 'admin', username: 'admin', name: 'Super Admin', password: 'admin123', role: 'super_admin', active: true, createdAt: new Date().toISOString() },
          { id: 'sales1', username: 'sales1', name: 'Priya Sharma', password: 'sales123', role: 'caller', active: true, createdAt: new Date().toISOString() },
          { id: 'sales2', username: 'sales2', name: 'Rahul Verma', password: 'sales123', role: 'caller', active: true, createdAt: new Date().toISOString() },
          { id: 'sales3', username: 'sales3', name: 'Neha Gupta', password: 'sales123', role: 'caller', active: true, createdAt: new Date().toISOString() },
          { id: 'sales4', username: 'sales4', name: 'Amit Singh', password: 'sales123', role: 'caller', active: true, createdAt: new Date().toISOString() },
          { id: 'sales5', username: 'sales5', name: 'Pooja Patel', password: 'sales123', role: 'caller', active: true, createdAt: new Date().toISOString() }
        ];
      }

      // Hash passwords with bcrypt
      const hashedUsers = usersToSeed.map(u => ({
        ...u,
        passwordHash: bcrypt.hashSync(u.password, 10),
        plainPassword: u.password // kept for admin display per requirement
      }));

      await usersCol.insertMany(hashedUsers);
      console.log(`✅ Seeded ${hashedUsers.length} secure users into MongoDB Atlas.`);
    }
  } catch (err) {
    console.error('Error during initDatabase:', err);
  }
}
