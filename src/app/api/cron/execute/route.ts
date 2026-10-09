import { NextResponse } from 'next/server';
import { evaluateAndRunSchedules } from '@/server/scheduler/engine';
import { getSessionUser } from '@/server/auth';
import { PodActionType } from '@/types';

function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  // In production, CRON_SECRET is strictly mandatory
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    return true; // allow in local dev only when no secret configured
  }

  // 1. Check Bearer Token (standard authorization header used by Vercel & external crons)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token === cronSecret) return true;
  }

  // 2. Check custom x-cron-secret header
  const customHeader = request.headers.get('x-cron-secret');
  if (customHeader && customHeader.trim() === cronSecret) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  try {
    // Check Cron Secret
    const isCronAuthorized = isAuthorizedCronRequest(request);

    // If not cron secret, check if authenticated admin session user is triggering manual test
    if (!isCronAuthorized) {
      const user = await getSessionUser(request);
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized: Valid CRON_SECRET or authenticated user session required' },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const forceActionType = searchParams.get('actionType') as PodActionType | undefined;
    const forceScheduleId = searchParams.get('scheduleId') || undefined;

    const report = await evaluateAndRunSchedules(
      new Date(),
      force ? forceScheduleId : undefined,
      force ? forceActionType : undefined
    );

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[API /api/cron/execute Error]:', errorMsg);
    return NextResponse.json(
      { error: 'Cron execution failure', details: errorMsg },
      { status: 500 }
    );
  }
}

// Support GET for standard webhooks / Vercel crons / Uptime monitors
export async function GET(request: Request) {
  return POST(request);
}
