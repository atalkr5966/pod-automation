import crypto from 'crypto';
import { getSupabaseServerClient } from './supabase-client';
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

export class SupabaseService {
  private getClient() {
    const client = getSupabaseServerClient();
    if (!client) {
      throw new Error('Supabase client is not configured.');
    }
    return client;
  }

  // Workspaces
  async getOrCreateWorkspace(slug: string = 'default-workspace', name: string = 'Default Workspace'): Promise<Workspace> {
    const supabase = this.getClient();
    const { data, error } = await supabase.from('workspaces').select('*').eq('slug', slug).maybeSingle();

    if (data) {
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    if (error && error.code !== 'PGRST116') {
      console.warn('[SupabaseService] getOrCreateWorkspace fetch error:', error.message);
    }

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { data: created, error: insertError } = await supabase
      .from('workspaces')
      .insert({ id: newId, name, slug, created_at: now, updated_at: now })
      .select('*')
      .single();

    if (insertError) {
      throw new Error(`Failed to create workspace: ${insertError.message}`);
    }

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };
  }

  // Users
  async findUserById(id: string): Promise<User | null> {
    const supabase = this.getClient();
    const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      username: data.username,
      email: data.email,
      name: data.name,
      passwordHash: data.password_hash,
      salt: data.salt,
      role: data.role || 'admin',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async findUserByEmailOrUsername(identifier: string): Promise<User | null> {
    const supabase = this.getClient();
    const clean = identifier.trim().toLowerCase();

    const { data: userByEmail } = await supabase
      .from('users')
      .select('*')
      .ilike('email', clean)
      .maybeSingle();

    if (userByEmail) {
      return {
        id: userByEmail.id,
        workspaceId: userByEmail.workspace_id,
        username: userByEmail.username,
        email: userByEmail.email,
        name: userByEmail.name,
        passwordHash: userByEmail.password_hash,
        salt: userByEmail.salt,
        role: userByEmail.role || 'admin',
        createdAt: userByEmail.created_at,
        updatedAt: userByEmail.updated_at,
      };
    }

    const { data: userByUsername } = await supabase
      .from('users')
      .select('*')
      .ilike('username', clean)
      .maybeSingle();

    if (userByUsername) {
      return {
        id: userByUsername.id,
        workspaceId: userByUsername.workspace_id,
        username: userByUsername.username,
        email: userByUsername.email,
        name: userByUsername.name,
        passwordHash: userByUsername.password_hash,
        salt: userByUsername.salt,
        role: userByUsername.role || 'admin',
        createdAt: userByUsername.created_at,
        updatedAt: userByUsername.updated_at,
      };
    }

    return null;
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
    const supabase = this.getClient();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const row = {
      id,
      workspace_id: data.workspaceId,
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
      name: data.name.trim() || data.username,
      password_hash: data.passwordHash,
      salt: data.salt,
      role: data.role || 'admin',
      created_at: now,
      updated_at: now,
    };

    const { data: created, error } = await supabase.from('users').insert(row).select('*').single();
    if (error) {
      throw new Error(`Failed to create user in Supabase: ${error.message}`);
    }

    return {
      id: created.id,
      workspaceId: created.workspace_id,
      username: created.username,
      email: created.email,
      name: created.name,
      passwordHash: created.password_hash,
      salt: created.salt,
      role: created.role,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const supabase = this.getClient();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.email !== undefined) row.email = updates.email;
    if (updates.passwordHash !== undefined) row.password_hash = updates.passwordHash;
    if (updates.salt !== undefined) row.salt = updates.salt;
    if (updates.role !== undefined) row.role = updates.role;

    const { data, error } = await supabase
      .from('users')
      .update(row)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      username: data.username,
      email: data.email,
      name: data.name,
      passwordHash: data.password_hash,
      salt: data.salt,
      role: data.role || 'admin',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Sessions
  async saveSession(session: Session): Promise<void> {
    const supabase = this.getClient();
    await supabase.from('sessions').upsert({
      token: session.token,
      user_id: session.userId,
      workspace_id: session.workspaceId,
      created_at: session.createdAt,
      expires_at: session.expiresAt,
    });
  }

  async getSession(token: string): Promise<Session | null> {
    const supabase = this.getClient();
    const { data } = await supabase.from('sessions').select('*').eq('token', token).maybeSingle();
    if (!data) return null;
    return {
      token: data.token,
      userId: data.user_id,
      workspaceId: data.workspace_id,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    };
  }

  async deleteSession(token: string): Promise<void> {
    const supabase = this.getClient();
    await supabase.from('sessions').delete().eq('token', token);
  }

  // Slack Connection
  async getSlackConnection(workspaceId: string): Promise<SlackConnection | null> {
    const supabase = this.getClient();
    const { data } = await supabase
      .from('slack_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      slackTeamId: data.slack_team_id,
      slackTeamName: data.slack_team_name,
      webhookUrl: data.webhook_url,
      botUserId: data.bot_user_id,
      botAccessToken: data.bot_access_token,
      defaultChannel: data.default_channel || '#general',
      status: data.status,
      lastTestedAt: data.last_tested_at,
      lastDeliveryAt: data.last_delivery_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async upsertSlackConnection(
    data: Partial<SlackConnection> & { workspaceId: string }
  ): Promise<SlackConnection> {
    const supabase = this.getClient();
    const existing = await this.getSlackConnection(data.workspaceId);
    const now = new Date().toISOString();

    const row: Record<string, unknown> = {
      workspace_id: data.workspaceId,
      updated_at: now,
    };

    if (data.webhookUrl !== undefined) row.webhook_url = data.webhookUrl;
    if (data.botAccessToken !== undefined) row.bot_access_token = data.botAccessToken;
    if (data.slackTeamName !== undefined) row.slack_team_name = data.slackTeamName;
    if (data.defaultChannel !== undefined) row.default_channel = data.defaultChannel;
    if (data.status !== undefined) row.status = data.status;
    if (data.lastTestedAt !== undefined) row.last_tested_at = data.lastTestedAt;
    if (data.lastDeliveryAt !== undefined) row.last_delivery_at = data.lastDeliveryAt;

    if (existing) {
      const { data: updated, error } = await supabase
        .from('slack_connections')
        .update(row)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return {
        id: updated.id,
        workspaceId: updated.workspace_id,
        slackTeamId: updated.slack_team_id,
        slackTeamName: updated.slack_team_name,
        webhookUrl: updated.webhook_url,
        botUserId: updated.bot_user_id,
        botAccessToken: updated.bot_access_token,
        defaultChannel: updated.default_channel,
        status: updated.status,
        lastTestedAt: updated.last_tested_at,
        lastDeliveryAt: updated.last_delivery_at,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };
    } else {
      row.id = crypto.randomUUID();
      row.created_at = now;
      const { data: inserted, error } = await supabase
        .from('slack_connections')
        .insert(row)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return {
        id: inserted.id,
        workspaceId: inserted.workspace_id,
        slackTeamId: inserted.slack_team_id,
        slackTeamName: inserted.slack_team_name,
        webhookUrl: inserted.webhook_url,
        botUserId: inserted.bot_user_id,
        botAccessToken: inserted.bot_access_token,
        defaultChannel: inserted.default_channel,
        status: inserted.status,
        lastTestedAt: inserted.last_tested_at,
        lastDeliveryAt: inserted.last_delivery_at,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      };
    }
  }

  async disconnectSlack(workspaceId: string): Promise<void> {
    const supabase = this.getClient();
    await supabase.from('slack_connections').delete().eq('workspace_id', workspaceId);
  }

  // Automation Schedules
  async listSchedules(workspaceId: string): Promise<AutomationSchedule[]> {
    const supabase = this.getClient();
    const { data } = await supabase
      .from('automation_schedules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    return (data || []).map((s) => ({
      id: s.id,
      workspaceId: s.workspace_id,
      name: s.name,
      description: s.description,
      timezone: s.timezone,
      openingEnabled: s.opening_enabled,
      openingTime: s.opening_time,
      closingEnabled: s.closing_enabled,
      closingTime: s.closing_time,
      daysOfWeek: Array.isArray(s.days_of_week) ? s.days_of_week : [1, 2, 3, 4, 5],
      channelId: s.channel_id,
      active: s.active,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  }

  async getActiveSchedules(): Promise<AutomationSchedule[]> {
    const supabase = this.getClient();
    const { data } = await supabase
      .from('automation_schedules')
      .select('*')
      .eq('active', true);

    return (data || []).map((s) => ({
      id: s.id,
      workspaceId: s.workspace_id,
      name: s.name,
      description: s.description,
      timezone: s.timezone,
      openingEnabled: s.opening_enabled,
      openingTime: s.opening_time,
      closingEnabled: s.closing_enabled,
      closingTime: s.closing_time,
      daysOfWeek: Array.isArray(s.days_of_week) ? s.days_of_week : [1, 2, 3, 4, 5],
      channelId: s.channel_id,
      active: s.active,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  }

  async getScheduleById(id: string): Promise<AutomationSchedule | null> {
    const supabase = this.getClient();
    const { data } = await supabase.from('automation_schedules').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      timezone: data.timezone,
      openingEnabled: data.opening_enabled,
      openingTime: data.opening_time,
      closingEnabled: data.closing_enabled,
      closingTime: data.closing_time,
      daysOfWeek: Array.isArray(data.days_of_week) ? data.days_of_week : [1, 2, 3, 4, 5],
      channelId: data.channel_id,
      active: data.active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async createSchedule(
    schedule: Omit<AutomationSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AutomationSchedule> {
    const supabase = this.getClient();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const row = {
      id,
      workspace_id: schedule.workspaceId,
      name: schedule.name,
      description: schedule.description || '',
      timezone: schedule.timezone,
      opening_enabled: schedule.openingEnabled,
      opening_time: schedule.openingTime,
      closing_enabled: schedule.closingEnabled,
      closing_time: schedule.closingTime,
      days_of_week: schedule.daysOfWeek,
      channel_id: schedule.channelId,
      active: schedule.active,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase.from('automation_schedules').insert(row).select('*').single();
    if (error) throw new Error(error.message);

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      timezone: data.timezone,
      openingEnabled: data.opening_enabled,
      openingTime: data.opening_time,
      closingEnabled: data.closing_enabled,
      closingTime: data.closing_time,
      daysOfWeek: data.days_of_week,
      channelId: data.channel_id,
      active: data.active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateSchedule(
    id: string,
    updates: Partial<AutomationSchedule>
  ): Promise<AutomationSchedule | null> {
    const supabase = this.getClient();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.name !== undefined) row.name = updates.name;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.timezone !== undefined) row.timezone = updates.timezone;
    if (updates.openingEnabled !== undefined) row.opening_enabled = updates.openingEnabled;
    if (updates.openingTime !== undefined) row.opening_time = updates.openingTime;
    if (updates.closingEnabled !== undefined) row.closing_enabled = updates.closingEnabled;
    if (updates.closingTime !== undefined) row.closing_time = updates.closingTime;
    if (updates.daysOfWeek !== undefined) row.days_of_week = updates.daysOfWeek;
    if (updates.channelId !== undefined) row.channel_id = updates.channelId;
    if (updates.active !== undefined) row.active = updates.active;

    const { data, error } = await supabase
      .from('automation_schedules')
      .update(row)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      timezone: data.timezone,
      openingEnabled: data.opening_enabled,
      openingTime: data.opening_time,
      closingEnabled: data.closing_enabled,
      closingTime: data.closing_time,
      daysOfWeek: data.days_of_week,
      channelId: data.channel_id,
      active: data.active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const supabase = this.getClient();
    const { error } = await supabase.from('automation_schedules').delete().eq('id', id);
    return !error;
  }

  // Execution & Delivery Logs
  async hasExecutionKey(key: string): Promise<boolean> {
    const supabase = this.getClient();
    const { data } = await supabase
      .from('execution_logs')
      .select('id')
      .eq('execution_key', key)
      .maybeSingle();
    return !!data;
  }

  async recordExecutionStart(params: {
    scheduleId?: string;
    actionId?: string;
    executionKey: string;
    actionType: PodActionType;
    channel: string;
  }): Promise<ExecutionLog> {
    const supabase = this.getClient();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const row = {
      id,
      schedule_id: params.scheduleId || null,
      action_id: params.actionId || null,
      execution_key: params.executionKey,
      action_type: params.actionType,
      channel: params.channel,
      started_at: now,
      status: 'RUNNING',
      duration_ms: 0,
      retry_count: 0,
      created_at: now,
    };

    const { data, error } = await supabase.from('execution_logs').insert(row).select('*').single();
    if (error) throw new Error(error.message);

    return {
      id: data.id,
      scheduleId: data.schedule_id,
      actionId: data.action_id,
      executionKey: data.execution_key,
      actionType: data.action_type,
      channel: data.channel,
      startedAt: data.started_at,
      durationMs: data.duration_ms,
      status: data.status,
      retryCount: data.retry_count,
      createdAt: data.created_at,
    };
  }

  /**
   * Atomically claims an execution lock in PostgreSQL.
   * If a record with this execution_key already exists, returns null (mutex lock denied).
   * Otherwise inserts the row with status 'RUNNING' and returns the log.
   */
  async claimExecutionLock(params: {
    scheduleId: string;
    executionKey: string;
    actionType: PodActionType;
    channel: string;
    actionId?: string;
  }): Promise<ExecutionLog | null> {
    const supabase = this.getClient();
    const now = new Date().toISOString();

    const row = {
      schedule_id: params.scheduleId,
      execution_key: params.executionKey,
      action_type: params.actionType,
      channel: params.channel,
      action_id: params.actionId || null,
      started_at: now,
      status: 'RUNNING',
      duration_ms: 0,
      retry_count: 0,
      created_at: now,
    };

    const { data, error } = await supabase.from('execution_logs').insert(row).select('*').maybeSingle();
    if (error) {
      // 23505 is PostgreSQL unique constraint violation
      if (
        error.code === '23505' ||
        error.message?.toLowerCase().includes('duplicate key') ||
        error.message?.toLowerCase().includes('unique constraint')
      ) {
        return null;
      }
      throw new Error(`Database error acquiring atomic execution lock: ${error.message}`);
    }

    if (!data) return null;

    return {
      id: data.id,
      scheduleId: data.schedule_id,
      actionId: data.action_id,
      executionKey: data.execution_key,
      actionType: data.action_type,
      channel: data.channel,
      startedAt: data.started_at,
      durationMs: data.duration_ms || 0,
      status: data.status,
      retryCount: data.retry_count || 0,
      createdAt: data.created_at,
    };
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
    const supabase = this.getClient();
    const now = new Date().toISOString();
    await supabase
      .from('execution_logs')
      .update({
        status: params.status,
        duration_ms: params.durationMs,
        error_message: params.errorMessage || null,
        retry_count: params.retryCount ?? 0,
        completed_at: now,
      })
      .eq('id', id);
  }

  async recordDelivery(params: {
    executionId?: string;
    actionId?: string;
    slackChannelId: string;
    slackMessageTs?: string;
    status: DeliveryStatus;
    response?: Record<string, unknown>;
  }): Promise<DeliveryLog> {
    const supabase = this.getClient();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const row = {
      id,
      execution_id: params.executionId || null,
      action_id: params.actionId || null,
      slack_channel_id: params.slackChannelId,
      slack_message_ts: params.slackMessageTs || null,
      status: params.status,
      response: params.response || {},
      created_at: now,
    };

    const { data, error } = await supabase.from('delivery_logs').insert(row).select('*').single();
    if (error) throw new Error(error.message);

    return {
      id: data.id,
      executionId: data.execution_id,
      actionId: data.action_id,
      slackChannelId: data.slack_channel_id,
      slackMessageTs: data.slack_message_ts,
      status: data.status,
      response: data.response,
      createdAt: data.created_at,
    };
  }

  async listExecutionLogs(workspaceId?: string, limit: number = 50): Promise<ExecutionLog[]> {
    const supabase = this.getClient();
    const query = supabase
      .from('execution_logs')
      .select('*, automation_schedules(name)')
      .order('started_at', { ascending: false })
      .limit(limit);

    const { data } = await query;

    return ((data || []) as unknown as Array<{
      id: string;
      schedule_id: string;
      automation_schedules?: { name?: string };
      action_id?: string;
      execution_key: string;
      action_type: 'OPENING' | 'CLOSING';
      channel: string;
      started_at: string;
      completed_at?: string;
      duration_ms?: number;
      status: 'SCHEDULED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'RETRYING';
      error_message?: string;
      retry_count?: number;
      created_at: string;
    }>).map((row) => ({
      id: row.id,
      scheduleId: row.schedule_id,
      scheduleName: row.automation_schedules?.name || 'Automation Schedule',
      actionId: row.action_id,
      executionKey: row.execution_key,
      actionType: row.action_type,
      channel: row.channel,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms || 0,
      status: row.status,
      errorMessage: row.error_message,
      retryCount: row.retry_count || 0,
      createdAt: row.created_at,
    }));
  }

  // Past Data
  async getPastData(workspaceId: string): Promise<PastDataEntry[]> {
    const supabase = this.getClient();
    const { data } = await supabase
      .from('past_data')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('date', { ascending: false });

    return (data || []).map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      date: row.date,
      type: row.type,
      category: row.category,
      tasks: Array.isArray(row.tasks) ? row.tasks : [],
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  async addPastData(entry: Omit<PastDataEntry, 'id' | 'createdAt'>): Promise<PastDataEntry> {
    const supabase = this.getClient();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const row = {
      id,
      workspace_id: entry.workspaceId,
      user_id: entry.userId || null,
      date: entry.date,
      type: entry.type,
      category: entry.category || 'Sprint Tasks',
      tasks: entry.tasks,
      notes: entry.notes || '',
      created_at: now,
    };

    const { data, error } = await supabase.from('past_data').insert(row).select('*').single();
    if (error) throw new Error(error.message);

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      userId: data.user_id,
      date: data.date,
      type: data.type,
      category: data.category,
      tasks: data.tasks,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  async deletePastData(id: string): Promise<boolean> {
    const supabase = this.getClient();
    const { error } = await supabase.from('past_data').delete().eq('id', id);
    return !error;
  }

  // Dashboard Stats
  async getDashboardStats(workspaceId: string) {
    const supabase = this.getClient();
    const [schedulesRes, successRes, failedRes, totalRes, lastDeliveryRes] = await Promise.all([
      supabase.from('automation_schedules').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('active', true),
      supabase.from('delivery_logs').select('id', { count: 'exact', head: true }).eq('status', 'SUCCESS'),
      supabase.from('delivery_logs').select('id', { count: 'exact', head: true }).eq('status', 'FAILED'),
      supabase.from('delivery_logs').select('id', { count: 'exact', head: true }),
      supabase.from('delivery_logs').select('*, execution_logs(*)').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    return {
      activeSchedulesCount: schedulesRes.count || 0,
      totalDeliveriesCount: totalRes.count || 0,
      successDeliveriesCount: successRes.count || 0,
      failedDeliveriesCount: failedRes.count || 0,
      lastDelivery: lastDeliveryRes.data || null,
    };
  }
}
