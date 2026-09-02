import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');

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
  time: string; // HH:MM format (24h) e.g.  09:30
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

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const HISTORY_FILE = path.join(DATA_DIR, 'pod_history.json');

function readJsonFile<T>(filePath: string, fallback: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
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

// Default initial past data for a user
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

// User CRUD operations
export function getAllUsers(): User[] {
  return readJsonFile<User[]>(USERS_FILE, []);
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
  writeJsonFile(USERS_FILE, users);
  return newUser;
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  writeJsonFile(USERS_FILE, users);
  return users[index];
}

// Session Management
interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export function createSession(userId: string): string {
  const sessions = readJsonFile<Session[]>(SESSIONS_FILE, []);
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  sessions.push({
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString()
  });

  writeJsonFile(SESSIONS_FILE, sessions);
  return token;
}

export function validateSession(token: string): User | null {
  if (!token) return null;
  const sessions = readJsonFile<Session[]>(SESSIONS_FILE, []);
  const session = sessions.find((s) => s.token === token);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return findUserById(session.userId) || null;
}

export function deleteSession(token: string): void {
  const sessions = readJsonFile<Session[]>(SESSIONS_FILE, []);
  const filtered = sessions.filter((s) => s.token !== token);
  writeJsonFile(SESSIONS_FILE, filtered);
}

// POD History Operations
export function getAllHistory(userId?: string): PodHistoryEntry[] {
  const all = readJsonFile<PodHistoryEntry[]>(HISTORY_FILE, []);
  if (userId) {
    return all.filter((h) => h.userId === userId).reverse();
  }
  return all.reverse();
}

export function addHistoryEntry(entry: Omit<PodHistoryEntry, 'id' | 'timestamp'>): PodHistoryEntry {
  const history = readJsonFile<PodHistoryEntry[]>(HISTORY_FILE, []);
  const newEntry: PodHistoryEntry = {
    ...entry,
    id: `hist_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString()
  };
  history.push(newEntry);
  writeJsonFile(HISTORY_FILE, history);
  return newEntry;
}

// Initialize default storage if needed
export function initDefaultData() {
  // Ensure storage is initialized cleanly without demo credentials
  getAllUsers();
}
