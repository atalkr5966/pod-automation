export type ExecutionStatus = 'SCHEDULED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'RETRYING' | 'SIMULATED';
export type DeliveryStatus = 'SUCCESS' | 'FAILED' | 'SIMULATED';
export type PodActionType = 'OPENING' | 'CLOSING';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  workspaceId: string;
  username: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'member';
  createdAt: string;
  updatedAt: string;
}

export interface SafeUser {
  id: string;
  workspaceId: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  createdAt: string;
}

export interface SlackConnection {
  id: string;
  workspaceId: string;
  slackTeamId?: string;
  slackTeamName?: string;
  webhookUrl?: string;
  botUserId?: string;
  botAccessToken?: string;
  defaultChannel: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastTestedAt?: string;
  lastDeliveryAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  workspaceId: string;
  slackConnectionId?: string;
  channelId: string;
  channelName: string;
  isPrivate: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationSchedule {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  timezone: string;
  openingEnabled: boolean;
  openingTime: string; // HH:MM 24hr format
  closingEnabled: boolean;
  closingTime: string; // HH:MM 24hr format
  daysOfWeek: number[]; // [1, 2, 3, 4, 5] (0 = Sunday, 1 = Monday ... 6 = Saturday)
  channelId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationAction {
  id: string;
  scheduleId: string;
  actionType: PodActionType;
  scheduledFor: string;
  status: ExecutionStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionLog {
  id: string;
  scheduleId?: string;
  scheduleName?: string;
  actionId?: string;
  executionKey: string;
  actionType: PodActionType;
  channel: string;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  status: ExecutionStatus;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
}

export interface DeliveryLog {
  id: string;
  executionId?: string;
  actionId?: string;
  slackChannelId: string;
  slackMessageTs?: string;
  status: DeliveryStatus;
  response: Record<string, unknown>;
  createdAt: string;
}

export interface PastDataEntry {
  id: string;
  workspaceId?: string;
  userId?: string;
  date: string;
  type: 'OPENING' | 'CLOSING' | 'GENERAL';
  category?: string;
  tasks: string[];
  notes?: string;
  createdAt: string;
}

export interface SystemSettings {
  id: string;
  workspaceId: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  token: string;
  userId: string;
  workspaceId: string;
  createdAt: string;
  expiresAt: string;
}

export interface NextRunCalculation {
  date: string;
  timeFormatted: string;
  iso: string;
  daysRemaining: number;
  label: string;
}

export interface ScheduleLivePreview {
  scheduleId: string;
  scheduleName: string;
  timezone: string;
  opening: {
    enabled: boolean;
    configuredTime: string;
    nextRun: NextRunCalculation | null;
  };
  closing: {
    enabled: boolean;
    configuredTime: string;
    nextRun: NextRunCalculation | null;
  };
  channel: string;
  active: boolean;
}

export interface CronExecutionReport {
  timestamp: string;
  schedulesEvaluated: number;
  jobsTriggered: number;
  jobsSucceeded: number;
  jobsFailed: number;
  jobsSkipped: number;
  details: {
    scheduleId: string;
    scheduleName: string;
    actionType: PodActionType;
    status: ExecutionStatus;
    executionKey: string;
    error?: string;
    channel: string;
  }[];
}
