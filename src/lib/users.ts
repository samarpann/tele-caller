import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { connectToDatabase } from './mongodb';

export interface User {
  id: string;
  username: string; // unique, e.g. "sales1", "admin"
  name: string;     // e.g. "Priya Sharma", "Super Admin"
  password?: string;
  plainPassword?: string;
  passwordHash?: string;
  role: 'super_admin' | 'caller';
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const FALLBACK_USERS: User[] = [
  {
    id: 'admin',
    username: 'admin',
    name: 'Super Admin',
    password: 'admin123',
    plainPassword: 'admin123',
    passwordHash: '$2b$10$3eci5yJphgDZBfyw4F608Owz2JDcMTZ2rypQDYVwjPTXhizzVidTS',
    role: 'super_admin',
    active: true,
    createdAt: '2026-11-06T12:00:00.000Z'
  },
  {
    id: 'sales1',
    username: 'sales1',
    name: 'Priya Sharma',
    password: 'sales123',
    plainPassword: 'sales123',
    passwordHash: '$2b$10$XJt6QMqPdXUFzlnPtCZceuvia7Z3DgcoYGCucqEyBgDKn9P7Cy6ra',
    role: 'caller',
    active: true,
    createdAt: '2026-11-06T12:00:00.000Z'
  },
  {
    id: 'sales2',
    username: 'sales2',
    name: 'Rahul Verma',
    password: 'sales123',
    plainPassword: 'sales123',
    passwordHash: '$2b$10$XJt6QMqPdXUFzlnPtCZceuvia7Z3DgcoYGCucqEyBgDKn9P7Cy6ra',
    role: 'caller',
    active: true,
    createdAt: '2026-11-06T12:00:00.000Z'
  },
  {
    id: 'sales3',
    username: 'sales3',
    name: 'Neha Gupta',
    password: 'sales123',
    plainPassword: 'sales123',
    passwordHash: '$2b$10$XJt6QMqPdXUFzlnPtCZceuvia7Z3DgcoYGCucqEyBgDKn9P7Cy6ra',
    role: 'caller',
    active: true,
    createdAt: '2026-11-06T12:00:00.000Z'
  },
  {
    id: 'sales4',
    username: 'sales4',
    name: 'Amit Singh',
    password: 'sales123',
    plainPassword: 'sales123',
    passwordHash: '$2b$10$XJt6QMqPdXUFzlnPtCZceuvia7Z3DgcoYGCucqEyBgDKn9P7Cy6ra',
    role: 'caller',
    active: true,
    createdAt: '2026-11-06T12:00:00.000Z'
  },
  {
    id: 'sales5',
    username: 'sales5',
    name: 'Pooja Patel',
    password: 'sales123',
    plainPassword: 'sales123',
    passwordHash: '$2b$10$XJt6QMqPdXUFzlnPtCZceuvia7Z3DgcoYGCucqEyBgDKn9P7Cy6ra',
    role: 'caller',
    active: true,
    createdAt: '2026-11-06T12:00:00.000Z'
  },
  {
    id: 'priyanshi',
    username: 'priyanshi',
    name: 'Priyanshi',
    password: '123456',
    plainPassword: '123456',
    passwordHash: '$2b$10$B7UUf7sBDkQ4YBkLrWbQSevRGF72EfoKe01wsp9fa.aJCECHLzF3.',
    role: 'caller',
    active: true,
    createdAt: '2026-11-06T12:00:00.000Z'
  }
];

let inMemoryUsers: User[] = [...FALLBACK_USERS];

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECRET_KEY = process.env.SESSION_SECRET || 'swastik_telecaller_ultra_secure_jwt_secret_key_2026_x89f2';

export async function getAllUsers(): Promise<User[]> {
  try {
    const { db } = await connectToDatabase();
    const users = await db.collection<User>('users').find({}).toArray();
    if (users && users.length > 0) {
      return users.map(u => ({
        id: u.id || u.username,
        username: u.username,
        name: u.name,
        password: (u as any).plainPassword || u.password,
        plainPassword: (u as any).plainPassword || u.password,
        passwordHash: u.passwordHash,
        role: u.role,
        active: u.active !== false,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));
    }
  } catch (err) {
    console.error('Mongo error in getAllUsers, fallback to local', err);
  }
  return getLocalUsers();
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const cleanUsername = username.toLowerCase().trim();
  try {
    const { db } = await connectToDatabase();
    const user = await db.collection<any>('users').findOne({
      username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') }
    });
    if (user) {
      return {
        id: user.id || user.username,
        username: user.username,
        name: user.name,
        password: user.plainPassword || user.password,
        plainPassword: user.plainPassword || user.password,
        passwordHash: user.passwordHash,
        role: user.role,
        active: user.active !== false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }
  } catch (err) {
    console.error('Mongo error in getUserByUsername, fallback to local', err);
  }

  // Fallback to in-memory/local users (guaranteed to contain admin, sales1..5, priyanshi)
  const local = getLocalUsers();
  return local.find(u => u.username.toLowerCase() === cleanUsername) || null;
}

export async function createUser(userData: {
  username: string;
  name: string;
  password: string;
  role?: 'super_admin' | 'caller';
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const cleanUsername = userData.username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');

  if (!cleanUsername) {
    return { success: false, error: 'User ID must contain valid letters or numbers' };
  }

  if (!userData.password || userData.password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters' };
  }

  const existing = await getUserByUsername(cleanUsername);
  if (existing) {
    return { success: false, error: `User with ID "${cleanUsername}" already exists` };
  }

  // Securely hash password with bcrypt
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(userData.password, salt);

  const newUser: User = {
    id: cleanUsername,
    username: cleanUsername,
    name: userData.name.trim() || cleanUsername,
    passwordHash: passwordHash,
    password: userData.password,
    plainPassword: userData.password, // stored for admin credential management
    role: userData.role || 'caller',
    active: true,
    createdAt: new Date().toISOString()
  };

  try {
    const { db } = await connectToDatabase();
    await db.collection('users').insertOne(newUser as any);
  } catch (err) {
    console.error('Mongo error in createUser, saving to local & memory', err);
  }

  // Update in-memory and local cache
  const local = getLocalUsers();
  local.push(newUser);
  inMemoryUsers = local;
  writeLocalUsers(local);

  return {
    success: true,
    user: {
      id: cleanUsername,
      username: cleanUsername,
      name: newUser.name,
      password: userData.password,
      role: newUser.role,
      active: true,
      createdAt: newUser.createdAt
    }
  };
}

export async function updateUser(
  username: string,
  updates: Partial<{ name: string; password: string; role: 'super_admin' | 'caller'; active: boolean }>
): Promise<{ success: boolean; error?: string }> {
  const cleanUsername = username.toLowerCase().trim();

  const updateFields: any = { updatedAt: new Date().toISOString() };
  if (updates.name) updateFields.name = updates.name.trim();
  if (updates.role) updateFields.role = updates.role;
  if (typeof updates.active === 'boolean') updateFields.active = updates.active;

  if (updates.password) {
    if (updates.password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters' };
    }
    updateFields.passwordHash = bcrypt.hashSync(updates.password, 10);
    updateFields.password = updates.password;
    updateFields.plainPassword = updates.password;
  }

  try {
    const { db } = await connectToDatabase();
    await db.collection('users').updateOne(
      { username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') } },
      { $set: updateFields }
    );
  } catch (err: any) {
    console.error('Mongo error in updateUser, updating in-memory', err);
  }

  // Also update in-memory / local
  const local = getLocalUsers();
  const idx = local.findIndex(u => u.username.toLowerCase() === cleanUsername);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updateFields };
    inMemoryUsers = local;
    writeLocalUsers(local);
  }

  return { success: true };
}

export async function deleteUser(username: string): Promise<{ success: boolean; error?: string }> {
  const cleanUsername = username.toLowerCase().trim();
  if (cleanUsername === 'admin') {
    return { success: false, error: 'Cannot delete the primary super admin' };
  }

  try {
    const { db } = await connectToDatabase();
    await db.collection('users').deleteOne({
      username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') }
    });
  } catch (err: any) {
    console.error('Mongo error in deleteUser', err);
  }

  const local = getLocalUsers().filter(u => u.username.toLowerCase() !== cleanUsername);
  inMemoryUsers = local;
  writeLocalUsers(local);

  return { success: true };
}

export function verifyPassword(plainPassword: string, user: any): boolean {
  if (user.passwordHash) {
    try {
      const match = bcrypt.compareSync(plainPassword, user.passwordHash);
      if (match) return true;
    } catch {}
  }
  return user.password === plainPassword || user.plainPassword === plainPassword;
}

// Session Token Creation & Verification using crypto HMAC
export function createSessionToken(user: { username: string; name: string; role: string }): string {
  const payload = {
    username: user.username,
    name: user.name,
    role: user.role,
    timestamp: Date.now()
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadStr)
    .digest('base64url');
  return `${payloadStr}.${signature}`;
}

export function verifySessionToken(token: string): { username: string; name: string; role: 'super_admin' | 'caller' } | null {
  if (!token || !token.includes('.')) return null;

  try {
    const [payloadStr, signature] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payloadStr)
      .digest('base64url');

    if (signature !== expectedSig) {
      return null;
    }

    const json = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    // Token valid for 30 days
    if (Date.now() - json.timestamp > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }

    return {
      username: json.username,
      name: json.name,
      role: json.role
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(req?: NextRequest): Promise<{ username: string; name: string; role: 'super_admin' | 'caller' } | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get('telecaller_session')?.value;
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('telecaller_session')?.value;
    } catch {
      // not in request context
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

// Fallback Local File helpers
function getLocalUsers(): User[] {
  const map = new Map<string, User>();
  // Seed with default users
  FALLBACK_USERS.forEach(u => map.set(u.username.toLowerCase(), u));

  // Merge in-memory users
  inMemoryUsers.forEach(u => map.set(u.username.toLowerCase(), u));

  // Merge local file if exists
  if (fs.existsSync(USERS_FILE)) {
    try {
      const fileUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (Array.isArray(fileUsers)) {
        fileUsers.forEach((u: User) => map.set(u.username.toLowerCase(), u));
      }
    } catch {}
  }

  return Array.from(map.values());
}

function writeLocalUsers(users: User[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch {}
}
