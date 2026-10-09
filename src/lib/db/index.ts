import { dbService, isSupabaseConfigured, getActiveStorageType } from '@/server/db';
import { getDefaultPastData } from './defaults';
import { PastDataEntry, User, Session } from '@/types';

export * from './types';
export { getDefaultPastData, isSupabaseConfigured };

export function getDatabaseType(): 'supabase' | 'file' {
  return getActiveStorageType() === 'supabase' ? 'supabase' : 'file';
}

export const db = {
  getAllUsers: async (): Promise<User[]> => {
    const user = await dbService.findUserByEmailOrUsername('admin');
    return user ? [user] : [];
  },
  findUserById: (id: string) => dbService.findUserById(id),
  findUserByUsernameOrEmail: (identifier: string) => dbService.findUserByEmailOrUsername(identifier),
  createUser: (userData: {
    username: string;
    email: string;
    name: string;
    passwordHash: string;
    salt: string;
    slackWebhook?: string;
  }) =>
    dbService.createUser({
      workspaceId: 'ws_default_production_core',
      ...userData,
    }),
  updateUser: (id: string, updates: Partial<User>) => dbService.updateUser(id, updates),
  getPastData: (workspaceId: string): Promise<PastDataEntry[]> => dbService.getPastData(workspaceId),
  addPastDataEntry: (workspaceId: string, entry: PastDataEntry) =>
    dbService.addPastData({ ...entry, workspaceId }),
  deletePastDataEntry: (_workspaceId: string, entryId: string) => dbService.deletePastData(entryId),
  getAllHistory: () => dbService.listExecutionLogs(),
  saveSession: (session: Session) => dbService.saveSession(session),
  getSession: (token: string) => dbService.getSession(token),
  deleteSession: (token: string) => dbService.deleteSession(token),
};
