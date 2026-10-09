import { NextResponse } from 'next/server';
import { isSupabaseConfigured, getActiveStorageType } from '@/server/db';

export async function GET() {
  const configured = isSupabaseConfigured();
  const storageType = getActiveStorageType();

  return NextResponse.json({
    activeDatabase: storageType === 'supabase' ? 'Supabase PostgreSQL' : 'Local Workspace Store (Fallback)',
    supabaseConfigured: configured,
    message: configured
      ? 'Connected to Supabase PostgreSQL Database'
      : 'Running in Local Storage Fallback Mode. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to activate Supabase PostgreSQL.',
    environmentCheck: {
      NEXT_PUBLIC_SUPABASE_URL: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SLACK_WEBHOOK_URL: !!process.env.SLACK_WEBHOOK_URL,
      CRON_SECRET: !!process.env.CRON_SECRET,
    },
  });
}
