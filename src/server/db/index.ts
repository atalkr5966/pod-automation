import { isSupabaseConfigured } from './supabase-client';
import { SupabaseService } from './supabase-service';
import { FallbackService } from './fallback-service';

let activeService: SupabaseService | FallbackService | null = null;

export function getDatabaseService(): SupabaseService | FallbackService {
  if (activeService) return activeService;

  if (isSupabaseConfigured()) {
    try {
      console.log('⚡ [DB] Active Storage: Supabase PostgreSQL');
      activeService = new SupabaseService();
      return activeService;
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `Production database initialization failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      console.warn('⚠️ [DB] Supabase initialization failed, falling back to local store in dev mode:', err);
    }
  }

  // If running in production, NEVER allow falling back to local JSON or in-memory store
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: Production database configuration error. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production. Local storage fallback is strictly forbidden in production.'
    );
  }

  console.log('📁 [DB] Active Storage: Local Store (Local Development & Test mode)');
  activeService = new FallbackService();
  return activeService;
}

export function resetDatabaseServiceForTesting(): void {
  activeService = null;
}

export function getActiveStorageType(): 'supabase' | 'fallback' {
  return isSupabaseConfigured() ? 'supabase' : 'fallback';
}

export type IDatabaseService = Pick<
  SupabaseService,
  | 'getOrCreateWorkspace'
  | 'findUserById'
  | 'findUserByEmailOrUsername'
  | 'createUser'
  | 'updateUser'
  | 'saveSession'
  | 'getSession'
  | 'deleteSession'
  | 'getSlackConnection'
  | 'upsertSlackConnection'
  | 'disconnectSlack'
  | 'listSchedules'
  | 'getActiveSchedules'
  | 'getScheduleById'
  | 'createSchedule'
  | 'updateSchedule'
  | 'deleteSchedule'
  | 'hasExecutionKey'
  | 'claimExecutionLock'
  | 'recordExecutionStart'
  | 'recordExecutionComplete'
  | 'recordDelivery'
  | 'listExecutionLogs'
  | 'getPastData'
  | 'addPastData'
  | 'deletePastData'
  | 'getDashboardStats'
>;

export const dbService: IDatabaseService = {
  getOrCreateWorkspace: (slug, name) => getDatabaseService().getOrCreateWorkspace(slug, name),
  findUserById: (id) => getDatabaseService().findUserById(id),
  findUserByEmailOrUsername: (identifier) => getDatabaseService().findUserByEmailOrUsername(identifier),
  createUser: (data) => getDatabaseService().createUser(data),
  updateUser: (id, updates) => getDatabaseService().updateUser(id, updates),
  saveSession: (session) => getDatabaseService().saveSession(session),
  getSession: (token) => getDatabaseService().getSession(token),
  deleteSession: (token) => getDatabaseService().deleteSession(token),
  getSlackConnection: (workspaceId) => getDatabaseService().getSlackConnection(workspaceId),
  upsertSlackConnection: (data) => getDatabaseService().upsertSlackConnection(data),
  disconnectSlack: (workspaceId) => getDatabaseService().disconnectSlack(workspaceId),
  listSchedules: (workspaceId) => getDatabaseService().listSchedules(workspaceId),
  getActiveSchedules: () => getDatabaseService().getActiveSchedules(),
  getScheduleById: (id) => getDatabaseService().getScheduleById(id),
  createSchedule: (schedule) => getDatabaseService().createSchedule(schedule),
  updateSchedule: (id, updates) => getDatabaseService().updateSchedule(id, updates),
  deleteSchedule: (id) => getDatabaseService().deleteSchedule(id),
  hasExecutionKey: (key) => getDatabaseService().hasExecutionKey(key),
  claimExecutionLock: (params) => getDatabaseService().claimExecutionLock(params),
  recordExecutionStart: (params) => getDatabaseService().recordExecutionStart(params),
  recordExecutionComplete: (id, params) => getDatabaseService().recordExecutionComplete(id, params),
  recordDelivery: (params) => getDatabaseService().recordDelivery(params),
  listExecutionLogs: (workspaceId, limit) => getDatabaseService().listExecutionLogs(workspaceId, limit),
  getPastData: (workspaceId) => getDatabaseService().getPastData(workspaceId),
  addPastData: (entry) => getDatabaseService().addPastData(entry),
  deletePastData: (id) => getDatabaseService().deletePastData(id),
  getDashboardStats: (workspaceId) => getDatabaseService().getDashboardStats(workspaceId),
};

export { isSupabaseConfigured };
