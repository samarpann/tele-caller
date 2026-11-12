import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { INITIAL_LEADS } from './initial-leads';
import { WEST_DELHI_JEWELLERS } from './west-delhi-jewellers';
import { FALLBACK_USERS } from './users';

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
    minPoolSize: 1,
    serverSelectionTimeoutMS: 4000,
    connectTimeoutMS: 4000,
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

    // Check if initial seeding needed
    const leadCount = await leadsCol.countDocuments();
    if (leadCount === 0) {
      console.log('Seeding 300 initial leads into MongoDB Atlas...');
      let leadsToSeed = INITIAL_LEADS;
      const localLeadsPath = path.join(process.cwd(), 'data', 'leads.json');
      if (fs.existsSync(localLeadsPath)) {
        try {
          const localLeads = JSON.parse(fs.readFileSync(localLeadsPath, 'utf8'));
          if (Array.isArray(localLeads) && localLeads.length > 0) {
            leadsToSeed = localLeads;
          }
        } catch {}
      }

      if (leadsToSeed.length > 0) {
        await leadsCol.insertMany(leadsToSeed as any);
        console.log(`✅ Seeded ${leadsToSeed.length} leads into MongoDB Atlas.`);
      }
    }

    // Ensure 180 West Delhi Jewellers are seeded if not present
    const jewellersCount = await leadsCol.countDocuments({ category: 'West Delhi Jewellers' });
    if (jewellersCount === 0 && WEST_DELHI_JEWELLERS.length > 0) {
      console.log('Seeding West Delhi Jewellers into MongoDB...');
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
      await leadsCol.bulkWrite(bulkOps);
      console.log('✅ Seeded West Delhi Jewellers into MongoDB Atlas.');
    }

    const userCount = await usersCol.countDocuments();
    if (userCount === 0) {
      console.log('Seeding initial users into MongoDB Atlas...');
      let usersToSeed = FALLBACK_USERS;
      const localUsersPath = path.join(process.cwd(), 'data', 'users.json');
      if (fs.existsSync(localUsersPath)) {
        try {
          const localUsers = JSON.parse(fs.readFileSync(localUsersPath, 'utf8'));
          if (Array.isArray(localUsers) && localUsers.length > 0) {
            usersToSeed = localUsers;
          }
        } catch {}
      }

      const hashedUsers = usersToSeed.map(u => ({
        ...u,
        passwordHash: u.passwordHash || (u.password ? bcrypt.hashSync(u.password, 10) : undefined),
        plainPassword: u.plainPassword || u.password
      }));

      await usersCol.insertMany(hashedUsers as any);
      console.log(`✅ Seeded ${hashedUsers.length} secure users into MongoDB Atlas.`);
    }
  } catch (err) {
    console.error('Error during initDatabase:', err);
  }
}
