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
  telegram?: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
  discord?: {
    enabled: boolean;
    webhookUrl: string;
  };
}

export interface ScheduleItem {
  enabled: boolean;
  time: string; // HH:MM format (24h) e.g. 09:30
  days: number[]; // 0 = Sun, 1 = Mon, ... 6 = Sat
  targetChannel?: string;
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

export interface IDatabaseAdapter {
  name: string;
  getAllUsers(): Promise<User[]>;
  findUserById(id: string): Promise<User | null>;
  findUserByUsernameOrEmail(identifier: string): Promise<User | null>;
  createUser(userData: {
    username: string;
    email: string;
    name: string;
    passwordHash: string;
    salt: string;
    slackWebhook?: string;
  }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  
  // Past Data operations
  getPastData(userId: string): Promise<PastDataEntry[]>;
  addPastDataEntry(userId: string, entry: PastDataEntry): Promise<PastDataEntry[]>;
  deletePastDataEntry(userId: string, entryId: string): Promise<PastDataEntry[]>;
  
  // History operations
  getAllHistory(userId?: string): Promise<PodHistoryEntry[]>;
  addHistoryEntry(entry: Omit<PodHistoryEntry, 'id' | 'timestamp'>): Promise<PodHistoryEntry>;
  
  // Sessions
  saveSession(session: Session): Promise<void>;
  getSession(token: string): Promise<Session | null>;
  deleteSession(token: string): Promise<void>;
}
