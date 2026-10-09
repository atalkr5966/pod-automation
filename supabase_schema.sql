-- ==============================================================================
-- POD Automation - Production Supabase PostgreSQL Relational Schema
-- ==============================================================================
-- Run this entire script in your Supabase Project -> SQL Editor -> Run

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SLACK CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.slack_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slack_team_id TEXT,
  slack_team_name TEXT DEFAULT 'Workspace Team',
  webhook_url TEXT,
  bot_user_id TEXT,
  bot_access_token TEXT,
  default_channel TEXT DEFAULT '#general',
  status TEXT NOT NULL DEFAULT 'CONNECTED',
  last_tested_at TIMESTAMPTZ,
  last_delivery_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_slack_workspace UNIQUE (workspace_id)
);

-- 4. CHANNELS TABLE
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slack_connection_id UUID REFERENCES public.slack_connections(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workspace_channel UNIQUE (workspace_id, channel_id)
);

-- 5. AUTOMATION SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.automation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Daily Engineering POD',
  description TEXT DEFAULT 'Automatic morning opening and evening closing sprint action items',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  opening_enabled BOOLEAN NOT NULL DEFAULT true,
  opening_time TEXT NOT NULL DEFAULT '09:30',
  closing_enabled BOOLEAN NOT NULL DEFAULT true,
  closing_time TEXT NOT NULL DEFAULT '18:30',
  days_of_week INT[] NOT NULL DEFAULT '{1, 2, 3, 4, 5}',
  channel_id TEXT NOT NULL DEFAULT '#general',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AUTOMATION ACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.automation_schedules(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'OPENING' or 'CLOSING'
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EXECUTION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.automation_schedules(id) ON DELETE SET NULL,
  action_id UUID REFERENCES public.automation_actions(id) ON DELETE SET NULL,
  execution_key TEXT UNIQUE NOT NULL,
  action_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT '#general',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'RUNNING', -- 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED', 'RETRYING'
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. DELIVERY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES public.execution_logs(id) ON DELETE CASCADE,
  action_id UUID REFERENCES public.automation_actions(id) ON DELETE SET NULL,
  slack_channel_id TEXT NOT NULL,
  slack_message_ts TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED', 'SIMULATED'
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PAST DATA TABLE (Domain task banks and historical sprint data)
CREATE TABLE IF NOT EXISTS public.past_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'GENERAL',
  category TEXT DEFAULT 'Sprint Tasks',
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workspace_setting_key UNIQUE (workspace_id, key)
);

-- 11. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE & CONCURRENCY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_workspace ON public.users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

CREATE INDEX IF NOT EXISTS idx_slack_workspace ON public.slack_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON public.channels(workspace_id);

CREATE INDEX IF NOT EXISTS idx_schedules_active ON public.automation_schedules(active, workspace_id);
CREATE INDEX IF NOT EXISTS idx_actions_scheduled_for ON public.automation_actions(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_actions_schedule_id ON public.automation_actions(schedule_id);

CREATE INDEX IF NOT EXISTS idx_exec_logs_key ON public.execution_logs(execution_key);
CREATE INDEX IF NOT EXISTS idx_exec_logs_status ON public.execution_logs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exec_logs_schedule ON public.execution_logs(schedule_id);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_execution ON public.delivery_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_past_data_workspace ON public.past_data(workspace_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow server-side service role full access
DROP POLICY IF EXISTS "Service role full access on workspaces" ON public.workspaces;
CREATE POLICY "Service role full access on workspaces" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on slack_connections" ON public.slack_connections;
CREATE POLICY "Service role full access on slack_connections" ON public.slack_connections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on channels" ON public.channels;
CREATE POLICY "Service role full access on channels" ON public.channels FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on automation_schedules" ON public.automation_schedules;
CREATE POLICY "Service role full access on automation_schedules" ON public.automation_schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on automation_actions" ON public.automation_actions;
CREATE POLICY "Service role full access on automation_actions" ON public.automation_actions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on execution_logs" ON public.execution_logs;
CREATE POLICY "Service role full access on execution_logs" ON public.execution_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on delivery_logs" ON public.delivery_logs;
CREATE POLICY "Service role full access on delivery_logs" ON public.delivery_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on past_data" ON public.past_data;
CREATE POLICY "Service role full access on past_data" ON public.past_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on system_settings" ON public.system_settings;
CREATE POLICY "Service role full access on system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on sessions" ON public.sessions;
CREATE POLICY "Service role full access on sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
