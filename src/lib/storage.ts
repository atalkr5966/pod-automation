import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export interface PastDataEntry {
  id: string;
  date: string;
  type: 'OPENING' | 'CLOSING' | 'GENERAL';
  tasks: string[];
  notes?: string;
  category?: string;
  createdAt: string;
}

export interface ChannelConfig {
  slack: {
    enabled: boolean;
    webhookUrl: string;
  };
}

export interface ScheduleItem {
  enabled: boolean;
  time: string; // HH:MM format (24h) e.g. 09:30
  days: number[]; // 0 = Sun, 1 = Mon, ... 6 = Sat
}

export interface UserSchedule {
  timezone: string;
  opening: ScheduleItem;
  closing: ScheduleItem;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  channels: ChannelConfig;
  schedule: UserSchedule;
  pastData: PastDataEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PodHistoryEntry {
  id: string;
  userId: string;
  username: string;
  type: 'OPENING' | 'CLOSING';
  channel: 'slack';
  content: string;
  status: 'SUCCESS' | 'FAILED' | 'SIMULATED';
  timestamp: string;
  error?: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  'pod_automation_secret_key_2026_npci_sec_token_99x';

// In-Memory Global Cache for serverless persistence across hot requests
declare global {
  var __podStorageCache: {
    users?: User[];
    sessions?: Session[];
    history?: PodHistoryEntry[];
    writableDir?: string;
  } | undefined;
}

const memoryStore = globalThis.__podStorageCache || (globalThis.__podStorageCache = {});

// Determine writable data directory (Local ./data or /tmp/pod_automation_data for Serverless/Vercel)
function getWritableDataDir(): string {
  if (memoryStore.writableDir) {
    return memoryStore.writableDir;
  }

  const localDataDir = path.join(process.cwd(), 'data');

  // Check if local directory is writable
  try {
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true });
    }
    const testFile = path.join(localDataDir, '.test_write');
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    memoryStore.writableDir = localDataDir;
    return localDataDir;
  } catch {
    // Read-only filesystem detected (Serverless / Vercel Lambda)
    const tmpDataDir = path.join(os.tmpdir(), 'pod_automation_data');
    try {
      if (!fs.existsSync(tmpDataDir)) {
        fs.mkdirSync(tmpDataDir, { recursive: true });
      }
    } catch (e) {
      console.warn('[Storage] Warning creating tmp data dir:', e);
    }
    memoryStore.writableDir = tmpDataDir;
    return tmpDataDir;
  }
}

function getFilePath(filename: 'users.json' | 'sessions.json' | 'pod_history.json'): string {
  const dir = getWritableDataDir();
  const targetPath = path.join(/*turbopackIgnore: true*/ dir, filename);

  // If running in /tmp and target file doesn't exist yet, try to copy initial bundled version
  if (dir !== path.join(process.cwd(), 'data') && !fs.existsSync(/*turbopackIgnore: true*/ targetPath)) {
    try {
      const bundledPath = path.join(process.cwd(), 'data', filename);
      if (fs.existsSync(bundledPath)) {
        const content = fs.readFileSync(bundledPath, 'utf-8');
        fs.writeFileSync(/*turbopackIgnore: true*/ targetPath, content, 'utf-8');
      }
    } catch (e) {
      // Ignore copy error, will fall back to default
    }
  }

  return targetPath;
}

function readJsonFile<T>(filename: 'users.json' | 'sessions.json' | 'pod_history.json', fallback: T): T {
  try {
    const filePath = getFilePath(filename);
    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      try {
        fs.writeFileSync(/*turbopackIgnore: true*/ filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      } catch {}
      return fallback;
    }
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[Storage] Read fallback for ${filename}:`, error);
    return fallback;
  }
}

function writeJsonFile<T>(filename: 'users.json' | 'sessions.json' | 'pod_history.json', data: T): void {
  try {
    const filePath = getFilePath(filename);
    fs.writeFileSync(/*turbopackIgnore: true*/ filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.warn(`[Storage] Disk write warning for ${filename}:`, error);
  }
}

// Password helpers
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

// Stateless Cryptographic JWT Helpers (HMAC-SHA256)
function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

export function signToken(payload: any): string {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): any | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Default initial past data for a new user
export function getDefaultPastData(): PastDataEntry[] {
  const today = new Date();
  const formatPastDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'log-1',
      date: formatPastDate(3),
      type: 'OPENING',
      category: 'Frontend & APIs',
      tasks: [
        'Review sprint backlog and daily priority items',
        'Implement responsive glassmorphism UI components',
        'Integrate multi-channel webhook dispatch API'
      ],
      notes: 'Sync with team scheduled for 11:00 AM',
      createdAt: new Date().toISOString()
    },
    {
      id: 'log-2',
      date: formatPastDate(3),
      type: 'CLOSING',
      category: 'Frontend & APIs',
      tasks: [
        'Completed UI components and webhook integrations',
        'Fixed state synchronizations on dashboard',
        'Tested webhook payload triggers with Slack & Discord'
      ],
      notes: 'All PRs submitted for review. Tomorrow focus on scheduling daemon.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'log-3',
      date: formatPastDate(2),
      type: 'OPENING',
      category: 'Backend & Automation',
      tasks: [
        'Review weekend production metrics & logs',
        'Build cron scheduling daemon for automated POD delivery',
        'Sync with backend lead at 2:00 PM'
      ],
      notes: 'No blockers. Target release scheduled for end of week.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'log-4',
      date: formatPastDate(2),
      type: 'CLOSING',
      category: 'Backend & Automation',
      tasks: [
        'Delivered node-cron daemon integration',
        'Successfully dispatched test alerts to Telegram bot',
        'Resolved timezone offset calculations for Asia/Kolkata'
      ],
      notes: 'Ready for full integration testing.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'log-5',
      date: formatPastDate(1),
      type: 'OPENING',
      category: 'Testing & Release',
      tasks: [
        'End-to-end testing of user login and channel management',
        'Prepare release notes and user documentation',
        'Final sprint wrap-up review'
      ],
      notes: 'High priority release today.',
      createdAt: new Date().toISOString()
    }
  ];
}

// User CRUD operations with dual-layer caching
export function getAllUsers(): User[] {
  const loaded = readJsonFile<User[]>('users.json', []);
  memoryStore.users = loaded;
  return loaded;
}

export function findUserById(id: string): User | undefined {
  const users = getAllUsers();
  return users.find((u) => u.id === id);
}

export function findUserByUsernameOrEmail(identifier: string): User | undefined {
  const users = getAllUsers();
  const lower = identifier.toLowerCase().trim();
  return users.find(
    (u) => u.username.toLowerCase() === lower || u.email.toLowerCase() === lower
  );
}

export function createUser(userData: {
  username: string;
  email: string;
  name: string;
  password: string;
  slackWebhook?: string;
}): User {
  const users = getAllUsers();
  const { hash, salt } = hashPassword(userData.password);

  const newUser: User = {
    id: `usr_${crypto.randomUUID()}`,
    username: userData.username.trim(),
    email: userData.email.trim(),
    name: userData.name.trim() || userData.username,
    passwordHash: hash,
    salt,
    channels: {
      slack: {
        enabled: !!userData.slackWebhook,
        webhookUrl: userData.slackWebhook || ''
      }
    },
    schedule: {
      timezone: 'Asia/Kolkata',
      opening: {
        enabled: true,
        time: '09:30',
        days: [1, 2, 3, 4, 5] // Mon to Fri
      },
      closing: {
        enabled: true,
        time: '18:30',
        days: [1, 2, 3, 4, 5] // Mon to Fri
      }
    },
    pastData: getDefaultPastData(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  users.push(newUser);
  memoryStore.users = users;
  writeJsonFile('users.json', users);
  return newUser;
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    // If not found in array yet, try finding by ID or create container instance record
    return null;
  }

  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  memoryStore.users = users;
  writeJsonFile('users.json', users);
  return users[index];
}

// Session Management with Stateless JWT + Persistent Container Caching
export function createSession(userOrId: User | string): string {
  const user = typeof userOrId === 'string' ? findUserById(userOrId) : userOrId;
  const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;

  const payload = {
    userId,
    username: user?.username || '',
    name: user?.name || '',
    email: user?.email || '',
    channels: user?.channels,
    schedule: user?.schedule,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days
  };

  const token = signToken(payload);

  // Also record in memory / local sessions
  const sessions = memoryStore.sessions || readJsonFile<Session[]>('sessions.json', []);
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  sessions.push({
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString()
  });

  memoryStore.sessions = sessions;
  writeJsonFile('sessions.json', sessions);

  return token;
}

export function validateSession(token: string): User | null {
  if (!token) return null;

  // 1. Primary: Verify Stateless Cryptographic JWT Token
  const payload = verifyToken(token);
  if (payload && payload.userId) {
    let user = findUserById(payload.userId);
    if (!user && payload.username) {
      // Reconstruct user state safely on cold lambda containers
      user = {
        id: payload.userId,
        username: payload.username,
        name: payload.name || payload.username,
        email: payload.email || `${payload.username}@company.com`,
        passwordHash: '',
        salt: '',
        channels: payload.channels || {
          slack: {
            enabled: false,
            webhookUrl: ''
          }
        },
        schedule: payload.schedule || {
          timezone: 'Asia/Kolkata',
          opening: { enabled: true, time: '09:30', days: [1, 2, 3, 4, 5] },
          closing: { enabled: true, time: '18:30', days: [1, 2, 3, 4, 5] }
        },
        pastData: getDefaultPastData(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const users = getAllUsers();
      if (!users.find((u) => u.id === user!.id)) {
        users.push(user);
        memoryStore.users = users;
        writeJsonFile('users.json', users);
      }
    }
    return user || null;
  }

  // 2. Fallback: Legacy file/memory session tokens
  const sessions = memoryStore.sessions || readJsonFile<Session[]>('sessions.json', []);
  memoryStore.sessions = sessions;

  const session = sessions.find((s) => s.token === token);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return findUserById(session.userId) || null;
}

export function deleteSession(token: string): void {
  const sessions = memoryStore.sessions || readJsonFile<Session[]>('sessions.json', []);
  const filtered = sessions.filter((s) => s.token !== token);
  memoryStore.sessions = filtered;
  writeJsonFile('sessions.json', filtered);
}

// POD History Operations
export function getAllHistory(userId?: string): PodHistoryEntry[] {
  const all = memoryStore.history || readJsonFile<PodHistoryEntry[]>('pod_history.json', []);
  memoryStore.history = all;
  if (userId) {
    return all.filter((h) => h.userId === userId).slice().reverse();
  }
  return all.slice().reverse();
}

export function addHistoryEntry(entry: Omit<PodHistoryEntry, 'id' | 'timestamp'>): PodHistoryEntry {
  const history = memoryStore.history || readJsonFile<PodHistoryEntry[]>('pod_history.json', []);
  const newEntry: PodHistoryEntry = {
    ...entry,
    id: `hist_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString()
  };
  history.push(newEntry);
  memoryStore.history = history;
  writeJsonFile('pod_history.json', history);
  return newEntry;
}

// Initialize default storage safely
export function initDefaultData() {
  const adminUser = process.env.ADMIN_USER || process.env.DEFAULT_USER;
  const adminPass = process.env.ADMIN_PASSWORD || process.env.DEFAULT_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL || process.env.DEFAULT_EMAIL;

  if (adminUser && adminPass) {
    const existing =
      findUserByUsernameOrEmail(adminUser) ||
      (adminEmail ? findUserByUsernameOrEmail(adminEmail) : undefined);
    if (!existing) {
      createUser({
        username: adminUser,
        email: adminEmail || `${adminUser}@company.com`,
        name: adminUser,
        password: adminPass,
        slackWebhook: process.env.SLACK_WEBHOOK_URL || '',
      });
    }
  } else {
    getAllUsers();
  }
}
