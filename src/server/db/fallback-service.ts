import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  Workspace,
  User,
  SlackConnection,
  AutomationSchedule,
  ExecutionLog,
  DeliveryLog,
  PastDataEntry,
  Session,
  ExecutionStatus,
  PodActionType,
  DeliveryStatus,
} from '@/types';
import { getDefaultPastData } from '@/lib/db/defaults';

interface LocalDbStore {
  workspaces: Workspace[];
  users: User[];
  slackConnections: SlackConnection[];
  schedules: AutomationSchedule[];
  executionLogs: ExecutionLog[];
  deliveryLogs: DeliveryLog[];
  pastData: PastDataEntry[];
  sessions: Session[];
}

export class FallbackService {
  private filePath: string;
  private store: LocalDbStore;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'dev_store.json');
    this.store = this.loadStore();
  }

  private loadStore(): LocalDbStore {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }

    const defaultWorkspaceId = 'ws_default_production_core';
    const now = new Date().toISOString();

    const initialStore: LocalDbStore = {
      workspaces: [
        {
          id: defaultWorkspaceId,
          name: 'Core Automation Workspace',
          slug: 'default-workspace',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [],
      slackConnections: [
        {
          id: 'conn_default_slack',
          workspaceId: defaultWorkspaceId,
          slackTeamId: 'T00_NPCI_TEAM',
          slackTeamName: 'NPCI PSO Integration Team',
          webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
          defaultChannel: '#general',
          status: 'CONNECTED',
          lastTestedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ],
      schedules: [
        {
          id: 'sched_daily_pso_sprint',
          workspaceId: defaultWorkspaceId,
          name: 'Daily Engineering POD',
          description: 'Automated Morning Opening & Evening Closing Sprint Dispatch',
          timezone: 'Asia/Kolkata',
          openingEnabled: true,
          openingTime: '09:30',
          closingEnabled: true,
          closingTime: '18:30',
          daysOfWeek: [1, 2, 3, 4, 5],
          channelId: '#general',
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      executionLogs: [],
      deliveryLogs: [],
      pastData: getDefaultPastData().map((pd) => ({
        id: pd.id || `log_${crypto.randomUUID()}`,
        workspaceId: defaultWorkspaceId,
        date: pd.date,
        type: pd.type,
        category: pd.category,
        tasks: pd.tasks,
        notes: pd.notes,
        createdAt: pd.createdAt || now,
      })),
      sessions: [],
    };

    this.saveStore(initialStore);
    return initialStore;
  }

  private saveStore(storeToSave?: LocalDbStore) {
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(storeToSave || this.store, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  // Workspaces
  async getOrCreateWorkspace(slug: string = 'default-workspace', name: string = 'Default Workspace'): Promise<Workspace> {
    let ws = this.store.workspaces.find((w) => w.slug === slug);
    if (!ws) {
      const now = new Date().toISOString();
      ws = {
        id: crypto.randomUUID(),
        name,
        slug,
        createdAt: now,
        updatedAt: now,
      };
      this.store.workspaces.push(ws);
      this.saveStore();
    }
    return ws;
  }

  // Users
  async findUserById(id: string): Promise<User | null> {
    return this.store.users.find((u) => u.id === id) || null;
  }

  async findUserByEmailOrUsername(identifier: string): Promise<User | null> {
    const clean = identifier.trim().toLowerCase();
    return (
      this.store.users.find(
        (u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
      ) || null
    );
  }

  async createUser(data: {
    workspaceId: string;
    username: string;
    email: string;
    name: string;
    passwordHash: string;
    salt: string;
    role?: 'admin' | 'member';
  }): Promise<User> {
    const now = new Date().toISOString();
    const newUser: User = {
      id: crypto.randomUUID(),
      workspaceId: data.workspaceId,
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
      name: data.name.trim() || data.username,
      passwordHash: data.passwordHash,
      salt: data.salt,
      role: data.role || 'admin',
      createdAt: now,
      updatedAt: now,
    };
    this.store.users.push(newUser);
    this.saveStore();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const idx = this.store.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.store.users[idx] = {
      ...this.store.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveStore();
    return this.store.users[idx];
  }

  // Sessions
  async saveSession(session: Session): Promise<void> {
    this.store.sessions = this.store.sessions.filter((s) => s.token !== session.token);
    this.store.sessions.push(session);
    this.saveStore();
  }

  async getSession(token: string): Promise<Session | null> {
    return this.store.sessions.find((s) => s.token === token) || null;
  }

  async deleteSession(token: string): Promise<void> {
    this.store.sessions = this.store.sessions.filter((s) => s.token !== token);
    this.saveStore();
  }

  // Slack Connection
  async getSlackConnection(workspaceId: string): Promise<SlackConnection | null> {
    return this.store.slackConnections.find((s) => s.workspaceId === workspaceId) || null;
  }

  async upsertSlackConnection(
    data: Partial<SlackConnection> & { workspaceId: string }
  ): Promise<SlackConnection> {
    const now = new Date().toISOString();
    const idx = this.store.slackConnections.findIndex((s) => s.workspaceId === data.workspaceId);
    if (idx >= 0) {
      this.store.slackConnections[idx] = {
        ...this.store.slackConnections[idx],
        ...data,
        updatedAt: now,
      };
      this.saveStore();
      return this.store.slackConnections[idx];
    } else {
      const conn: SlackConnection = {
        id: crypto.randomUUID(),
        workspaceId: data.workspaceId,
        slackTeamId: data.slackTeamId,
        slackTeamName: data.slackTeamName || 'Workspace Team',
        webhookUrl: data.webhookUrl,
        botUserId: data.botUserId,
        botAccessToken: data.botAccessToken,
        defaultChannel: data.defaultChannel || '#general',
        status: data.status || 'CONNECTED',
        lastTestedAt: data.lastTestedAt,
        lastDeliveryAt: data.lastDeliveryAt,
        createdAt: now,
        updatedAt: now,
      };
      this.store.slackConnections.push(conn);
      this.saveStore();
      return conn;
    }
  }

  async disconnectSlack(workspaceId: string): Promise<void> {
    this.store.slackConnections = this.store.slackConnections.filter((s) => s.workspaceId !== workspaceId);
    this.saveStore();
  }

  // Automation Schedules
  async listSchedules(workspaceId: string): Promise<AutomationSchedule[]> {
    return this.store.schedules.filter((s) => s.workspaceId === workspaceId);
  }

  async getActiveSchedules(): Promise<AutomationSchedule[]> {
    return this.store.schedules.filter((s) => s.active);
  }

  async getScheduleById(id: string): Promise<AutomationSchedule | null> {
    return this.store.schedules.find((s) => s.id === id) || null;
  }

  async createSchedule(
    schedule: Omit<AutomationSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AutomationSchedule> {
    const now = new Date().toISOString();
    const newSched: AutomationSchedule = {
      id: `sched_${crypto.randomUUID()}`,
      ...schedule,
      createdAt: now,
      updatedAt: now,
    };
    this.store.schedules.push(newSched);
    this.saveStore();
    return newSched;
  }

  async updateSchedule(
    id: string,
    updates: Partial<AutomationSchedule>
  ): Promise<AutomationSchedule | null> {
    const idx = this.store.schedules.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.store.schedules[idx] = {
      ...this.store.schedules[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveStore();
    return this.store.schedules[idx];
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const initialLen = this.store.schedules.length;
    this.store.schedules = this.store.schedules.filter((s) => s.id !== id);
    if (this.store.schedules.length !== initialLen) {
      this.saveStore();
      return true;
    }
    return false;
  }

  // Execution & Delivery Logs
  async hasExecutionKey(key: string): Promise<boolean> {
    return this.store.executionLogs.some((l) => l.executionKey === key);
  }

  async recordExecutionStart(params: {
    scheduleId?: string;
    actionId?: string;
    executionKey: string;
    actionType: PodActionType;
    channel: string;
  }): Promise<ExecutionLog> {
    const sched = params.scheduleId
      ? this.store.schedules.find((s) => s.id === params.scheduleId)
      : null;
    const now = new Date().toISOString();
    const log: ExecutionLog = {
      id: `exec_${crypto.randomUUID()}`,
      scheduleId: params.scheduleId,
      scheduleName: sched?.name || 'Automation Schedule',
      actionId: params.actionId,
      executionKey: params.executionKey,
      actionType: params.actionType,
      channel: params.channel,
      startedAt: now,
      durationMs: 0,
      status: 'RUNNING',
      retryCount: 0,
      createdAt: now,
    };
    this.store.executionLogs.unshift(log);
    this.saveStore();
    return log;
  }

  async claimExecutionLock(params: {
    scheduleId: string;
    executionKey: string;
    actionType: PodActionType;
    channel: string;
    actionId?: string;
  }): Promise<ExecutionLog | null> {
    const existing = this.store.executionLogs.find((l) => l.executionKey === params.executionKey);
    if (existing) {
      return null;
    }

    const now = new Date().toISOString();
    const sched = this.store.schedules.find((s) => s.id === params.scheduleId);
    const log: ExecutionLog = {
      id: crypto.randomUUID(),
      scheduleId: params.scheduleId,
      scheduleName: sched?.name || 'Automation Schedule',
      actionId: params.actionId,
      executionKey: params.executionKey,
      actionType: params.actionType,
      channel: params.channel,
      startedAt: now,
      durationMs: 0,
      status: 'RUNNING',
      retryCount: 0,
      createdAt: now,
    };
    this.store.executionLogs.unshift(log);
    this.saveStore();
    return log;
  }

  async recordExecutionComplete(
    id: string,
    params: {
      status: ExecutionStatus;
      durationMs: number;
      errorMessage?: string;
      retryCount?: number;
    }
  ): Promise<void> {
    const idx = this.store.executionLogs.findIndex((l) => l.id === id);
    if (idx >= 0) {
      this.store.executionLogs[idx] = {
        ...this.store.executionLogs[idx],
        status: params.status,
        durationMs: params.durationMs,
        errorMessage: params.errorMessage,
        retryCount: params.retryCount ?? this.store.executionLogs[idx].retryCount,
        completedAt: new Date().toISOString(),
      };
      this.saveStore();
    }
  }

  async recordDelivery(params: {
    executionId?: string;
    actionId?: string;
    slackChannelId: string;
    slackMessageTs?: string;
    status: DeliveryStatus;
    response?: Record<string, unknown>;
  }): Promise<DeliveryLog> {
    const now = new Date().toISOString();
    const log: DeliveryLog = {
      id: `deliv_${crypto.randomUUID()}`,
      executionId: params.executionId,
      actionId: params.actionId,
      slackChannelId: params.slackChannelId,
      slackMessageTs: params.slackMessageTs,
      status: params.status,
      response: params.response || {},
      createdAt: now,
    };
    this.store.deliveryLogs.unshift(log);
    this.saveStore();
    return log;
  }

  async listExecutionLogs(workspaceId?: string, limit: number = 50): Promise<ExecutionLog[]> {
    return this.store.executionLogs.slice(0, limit);
  }

  // Past Data
  async getPastData(workspaceId: string): Promise<PastDataEntry[]> {
    return this.store.pastData.filter((p) => !p.workspaceId || p.workspaceId === workspaceId);
  }

  async addPastData(entry: Omit<PastDataEntry, 'id' | 'createdAt'>): Promise<PastDataEntry> {
    const now = new Date().toISOString();
    const newEntry: PastDataEntry = {
      id: `log_${crypto.randomUUID()}`,
      ...entry,
      createdAt: now,
    };
    this.store.pastData.unshift(newEntry);
    this.saveStore();
    return newEntry;
  }

  async deletePastData(id: string): Promise<boolean> {
    const initLen = this.store.pastData.length;
    this.store.pastData = this.store.pastData.filter((p) => p.id !== id);
    if (this.store.pastData.length !== initLen) {
      this.saveStore();
      return true;
    }
    return false;
  }

  // Dashboard Stats
  async getDashboardStats(workspaceId: string) {
    const activeSchedulesCount = this.store.schedules.filter(
      (s) => s.workspaceId === workspaceId && s.active
    ).length;
    const totalDeliveriesCount = this.store.deliveryLogs.length;
    const successDeliveriesCount = this.store.deliveryLogs.filter((d) => d.status === 'SUCCESS').length;
    const failedDeliveriesCount = this.store.deliveryLogs.filter((d) => d.status === 'FAILED').length;
    const lastDelivery = this.store.deliveryLogs[0] || null;

    return {
      activeSchedulesCount,
      totalDeliveriesCount,
      successDeliveriesCount,
      failedDeliveriesCount,
      lastDelivery,
    };
  }
}
