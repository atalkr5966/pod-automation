import { dbService } from '@/server/db';
import { hashPassword, verifyPassword, signToken, verifyToken } from '@/server/auth';
import { getDefaultPastData } from '@/lib/db/defaults';
import { PastDataEntry, ExecutionLog, User } from '@/types';

export type { PastDataEntry, ExecutionLog, User };
export { getDefaultPastData, hashPassword, verifyPassword, signToken, verifyToken };

export async function getAllUsers(): Promise<User[]> {
  const user = await dbService.findUserByEmailOrUsername('admin');
  if (user) return [user];
  return [];
}

export async function findUserById(id: string): Promise<User | null> {
  return dbService.findUserById(id);
}

export async function findUserByUsernameOrEmail(identifier: string): Promise<User | null> {
  return dbService.findUserByEmailOrUsername(identifier);
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  return dbService.updateUser(id, updates);
}

export async function getAllHistory(): Promise<ExecutionLog[]> {
  return dbService.listExecutionLogs();
}
